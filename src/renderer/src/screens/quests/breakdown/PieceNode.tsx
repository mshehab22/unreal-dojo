// One piece on the breakdown board: its kind, its name, and its purpose label, with a warning while the purpose is missing.
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import type { BreakdownPiece } from "@shared/types/progress";

import { cn } from "@/lib/utils";

/** The data a piece node carries. */
export type PieceNodeData = { piece: BreakdownPiece; readOnly: boolean };

/** The React Flow node type for a piece. */
export type PieceFlowNode = Node<PieceNodeData, "piece">;

/** The accent of each piece kind, from the pack and outcome tokens. */
const KIND_CLASS: Readonly<Record<BreakdownPiece["kind"], string>> = {
	class: "border-foundations/70 text-foundations",
	component: "border-mechanics/70 text-mechanics",
	data: "border-systems/70 text-systems",
	event: "border-patterns/70 text-patterns",
	step: "border-line-strong text-paper-muted",
};

/** A card with handles on both sides for arrows. */
export function PieceNode({ data, selected }: NodeProps<PieceFlowNode>)
{
	const { piece, readOnly } = data;
	const needsPurpose = !readOnly && piece.purpose.trim().length === 0;

	return (
		<div data-testid="piece-node" data-piece={piece.id} data-kind={piece.kind} className={cn("flex w-52 flex-col gap-1.5 rounded-md border bg-raised px-3 py-2.5 shadow-raised", selected ? "border-pack ring-2 ring-ring" : "border-line-strong")}>
			<Handle type="target" position={Position.Left} className="!size-2.5 !border-line-strong !bg-overlay" isConnectable={!readOnly} />
			<span className={cn("self-start rounded-xs border px-1.5 font-mono text-2xs tracking-widest uppercase", KIND_CLASS[piece.kind])}>{piece.kind}</span>
			<span className={cn("text-sm leading-snug font-medium", piece.label ? "text-paper" : "text-paper-faint italic")}>{piece.label || "Name this piece"}</span>
			{!readOnly && <span className={cn("text-xs leading-snug", needsPurpose ? "text-warn" : "text-paper-muted")}>{needsPurpose ? "Purpose needed" : piece.purpose}</span>}
			<Handle type="source" position={Position.Right} className="!size-2.5 !border-line-strong !bg-overlay" isConnectable={!readOnly} />
		</div>
	);
}
