// Arrows by keyboard: pick a start piece, what the arrow means, and the end piece; the list shows every arrow with a remove button.
import { PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";

import type { BreakdownEdgeKind, BreakdownPlan } from "@shared/types/progress";

import { Button } from "@/components/ui/button";

import { EDGE_KINDS, edgeKindLabel, withEdge } from "./boardModel";

/** Props for ArrowPanel. */
interface ArrowPanelProps
{
	readonly plan: BreakdownPlan;
	readonly onPlanChange: (plan: BreakdownPlan) => void;
	readonly edgeKind: BreakdownEdgeKind;
	readonly onEdgeKindChange: (kind: BreakdownEdgeKind) => void;
}

/** Shared look of the selects. */
const SELECT_CLASS = "h-9 w-full min-w-0 rounded-md border border-input bg-ink px-2 text-sm text-paper outline-none focus-visible:border-pack focus-visible:ring-2 focus-visible:ring-ring";

/** The arrow form and list. The kind chosen here is also what a dragged arrow gets. */
export function ArrowPanel({ plan, onPlanChange, edgeKind, onEdgeKindChange }: ArrowPanelProps)
{
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	const names = new Map(plan.pieces.map((piece) => [piece.id, piece.label || "Unnamed piece"]));

	/** Adds the arrow in the form. */
	const add = (): void =>
	{
		if (from && to) onPlanChange(withEdge(plan, from, to, edgeKind));
	};

	if (plan.pieces.length < 2) return <p className="text-xs text-paper-faint">Add two pieces to draw arrows between them: drag from a card's right dot to another card, or use this form.</p>;

	return (
		<div data-testid="arrow-panel" className="flex flex-col gap-2">
			<div className="grid grid-cols-[1fr_auto] gap-1.5">
				<select aria-label="Arrow from" value={from} onChange={(event) => setFrom(event.target.value)} className={SELECT_CLASS}>
					<option value="">From</option>
					{plan.pieces.map((piece) => (
						<option key={piece.id} value={piece.id}>
							{names.get(piece.id)}
						</option>
					))}
				</select>
				<span />
				<select aria-label="Arrow meaning" value={edgeKind} onChange={(event) => onEdgeKindChange(event.target.value as BreakdownEdgeKind)} className={SELECT_CLASS}>
					{EDGE_KINDS.map((kind) => (
						<option key={kind.kind} value={kind.kind}>
							{kind.label}
						</option>
					))}
				</select>
				<span />
				<select aria-label="Arrow to" value={to} onChange={(event) => setTo(event.target.value)} className={SELECT_CLASS}>
					<option value="">To</option>
					{plan.pieces.map((piece) => (
						<option key={piece.id} value={piece.id}>
							{names.get(piece.id)}
						</option>
					))}
				</select>
				<Button size="icon" variant="secondary" aria-label="Add arrow" disabled={!from || !to || from === to} onClick={add}>
					<PlusIcon />
				</Button>
			</div>
			{plan.edges.length > 0 && (
				<ul aria-label="Arrows" className="flex flex-col gap-1 text-xs text-paper-muted">
					{plan.edges.map((edge) => (
						<li key={`${edge.from}->${edge.to}:${edge.kind}`} data-testid="arrow-item" className="flex items-center gap-1.5">
							<span className="min-w-0 flex-1 truncate">
								{names.get(edge.from)} <span className="text-pack">{edgeKindLabel(edge.kind)}</span> {names.get(edge.to)}
							</span>
							<Button size="icon" variant="ghost" className="size-6" aria-label="Remove arrow" onClick={() => onPlanChange({ ...plan, edges: plan.edges.filter((other) => other !== edge) })}>
								<XIcon />
							</Button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
