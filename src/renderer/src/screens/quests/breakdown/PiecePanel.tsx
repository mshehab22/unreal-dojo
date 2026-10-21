// The keyboard way into the board: every piece in a list, a button per kind to add one, and the selected piece's kind, name, and purpose.
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import type { PieceKind } from "@shared/types/content";
import type { BreakdownPiece, BreakdownPlan } from "@shared/types/progress";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { newPiece, PIECE_KINDS, withoutPiece } from "./boardModel";

/** Props for PiecePanel. */
interface PiecePanelProps
{
	readonly plan: BreakdownPlan;
	readonly onPlanChange: (plan: BreakdownPlan) => void;
	readonly selectedPieceId: string | null;
	readonly onSelectPiece: (pieceId: string | null) => void;
}

/** Shared look of the panel's text fields. */
const FIELD_CLASS = "w-full rounded-md border border-input bg-ink px-3 text-sm text-paper outline-none select-text focus-visible:border-pack focus-visible:ring-2 focus-visible:ring-ring";

/** Add buttons, the piece list, and the editor for the selected piece. */
export function PiecePanel({ plan, onPlanChange, selectedPieceId, onSelectPiece }: PiecePanelProps)
{
	const selected = plan.pieces.find((piece) => piece.id === selectedPieceId) ?? null;

	// Only a piece added from this panel takes focus, so the panel appearing elsewhere (the compare step) never pulls the page down to it.
	const [addedPieceId, setAddedPieceId] = useState<string | null>(null);

	/** Adds a piece of a kind and selects it so its name can be typed at once. */
	const add = (kind: PieceKind): void =>
	{
		const piece = newPiece(kind, plan);

		onPlanChange({ ...plan, pieces: [...plan.pieces, piece] });
		onSelectPiece(piece.id);
		setAddedPieceId(piece.id);
	};

	/** Changes one field of the selected piece. */
	const update = (changes: Partial<BreakdownPiece>): void =>
	{
		if (!selected) return;

		onPlanChange({ ...plan, pieces: plan.pieces.map((piece) => (piece.id === selected.id ? { ...piece, ...changes } : piece)) });
	};

	/** Removes the selected piece and its arrows. */
	const remove = (): void =>
	{
		if (!selected) return;

		onPlanChange(withoutPiece(plan, selected.id));
		onSelectPiece(null);
	};

	return (
		<div data-testid="piece-panel" className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">Add a piece</span>
				<div className="flex flex-wrap gap-1.5">
					{PIECE_KINDS.map((kind) => (
						<Button key={kind} size="sm" variant="secondary" onClick={() => add(kind)} data-testid={`add-piece-${kind}`}>
							<PlusIcon />
							{kind}
						</Button>
					))}
				</div>
			</div>

			{plan.pieces.length > 0 && (
				<ul aria-label="Pieces" className="flex flex-col gap-1">
					{plan.pieces.map((piece) => (
						<li key={piece.id}>
							<button
								type="button"
								data-testid="piece-list-item"
								onClick={() => onSelectPiece(piece.id)}
								aria-pressed={piece.id === selectedPieceId}
								className={cn("flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring", piece.id === selectedPieceId ? "bg-raised text-paper" : "text-paper-muted hover:bg-raised")}
							>
								<span className="w-20 shrink-0 font-mono text-2xs text-paper-faint uppercase">{piece.kind}</span>
								<span className="truncate">{piece.label || "Unnamed piece"}</span>
								{piece.purpose.trim() === "" && <span className="ml-auto size-1.5 shrink-0 rounded-pill bg-warn" aria-label="Purpose needed" />}
							</button>
						</li>
					))}
				</ul>
			)}

			{selected && (
				<div data-testid="piece-editor" className="flex flex-col gap-3 rounded-md border border-line bg-raised p-3">
					<label className="flex flex-col gap-1">
						<span className="text-xs text-paper-faint">Kind</span>
						<select value={selected.kind} onChange={(event) => update({ kind: event.target.value as PieceKind })} className={cn(FIELD_CLASS, "h-9")}>
							{PIECE_KINDS.map((kind) => (
								<option key={kind} value={kind}>
									{kind}
								</option>
							))}
						</select>
					</label>
					<label className="flex flex-col gap-1">
						<span className="text-xs text-paper-faint">Name</span>
						<input data-testid="piece-label" value={selected.label} onChange={(event) => update({ label: event.target.value })} autoFocus={selected.id === addedPieceId} placeholder="For example DashComponent" maxLength={200} className={cn(FIELD_CLASS, "h-9")} />
					</label>
					<label className="flex flex-col gap-1">
						<span className="text-xs text-paper-faint">Purpose (required): what is it for?</span>
						<textarea data-testid="piece-purpose" value={selected.purpose} onChange={(event) => update({ purpose: event.target.value })} rows={3} maxLength={2000} placeholder="Owns the cooldown so other abilities can reuse it" className={cn(FIELD_CLASS, "resize-none py-2")} />
					</label>
					<Button size="sm" variant="ghost" className="self-start text-fail" onClick={remove}>
						<Trash2Icon />
						Remove piece
					</Button>
				</div>
			)}
		</div>
	);
}
