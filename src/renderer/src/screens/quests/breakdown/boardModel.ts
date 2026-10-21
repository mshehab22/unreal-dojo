// Pure helpers for the breakdown board: new pieces, a starting layout, what still blocks a submit, and a reference plan in the board's shape.
import type { PieceKind, ReferencePlan } from "@shared/types/content";
import type { BreakdownEdgeKind, BreakdownPiece, BreakdownPlan } from "@shared/types/progress";

/** A point on the board. */
export interface BoardPosition
{
	x: number;
	y: number;
}

/** The piece kinds in board order, left to right. */
export const PIECE_KINDS: readonly PieceKind[] = ["step", "class", "component", "data", "event"];

/** The arrow kinds and how each reads. */
export const EDGE_KINDS: readonly { kind: BreakdownEdgeKind; label: string }[] = [
	{ kind: "owns", label: "owns" },
	{ kind: "listens-to", label: "listens to" },
	{ kind: "spawns", label: "spawns" },
	{ kind: "then", label: "then" },
];

/** The words for an arrow kind. */
export function edgeKindLabel(kind: BreakdownEdgeKind): string
{
	return EDGE_KINDS.find((candidate) => candidate.kind === kind)?.label ?? kind;
}

/** An empty board. */
export function emptyPlan(): BreakdownPlan
{
	return { pieces: [], edges: [] };
}

/** A new piece with an id no other piece has, and blank label and purpose. */
export function newPiece(kind: PieceKind, plan: BreakdownPlan): BreakdownPiece
{
	const used = new Set(plan.pieces.map((piece) => piece.id));
	let number = plan.pieces.length + 1;

	while (used.has(`piece-${number}`)) number += 1;

	return { id: `piece-${number}`, kind, label: "", purpose: "" };
}

/** Width and height of one grid slot, in board units. */
const COLUMN_WIDTH = 240;
const ROW_HEIGHT = 130;

/** A starting position for every piece: a grid about twice as tall as wide, pieces sorted by kind (steps first), so a board fits a half-width view at a readable zoom. Positions the learner dragged are kept. */
export function layoutPositions(plan: BreakdownPlan, kept: Readonly<Record<string, BoardPosition>> = {}): Record<string, BoardPosition>
{
	const columns = Math.max(1, Math.ceil(Math.sqrt(plan.pieces.length / 2)));
	const ordered = [...plan.pieces].sort((first, second) => PIECE_KINDS.indexOf(first.kind) - PIECE_KINDS.indexOf(second.kind));
	const positions: Record<string, BoardPosition> = {};

	ordered.forEach((piece, index) =>
	{
		positions[piece.id] = kept[piece.id] ?? { x: (index % columns) * COLUMN_WIDTH, y: Math.floor(index / columns) * ROW_HEIGHT };
	});

	return positions;
}

/** Every reason the plan cannot be submitted yet, in plain words. Empty when it can. */
export function planProblems(plan: BreakdownPlan): string[]
{
	const problems: string[] = [];

	if (plan.pieces.length === 0) problems.push("Add at least one piece.");

	const unnamed = plan.pieces.filter((piece) => piece.label.trim().length === 0).length;
	const withoutPurpose = plan.pieces.filter((piece) => piece.purpose.trim().length === 0).length;

	if (unnamed > 0) problems.push(unnamed === 1 ? "One piece has no name." : `${unnamed} pieces have no name.`);
	if (withoutPurpose > 0) problems.push(withoutPurpose === 1 ? "One piece has no purpose label." : `${withoutPurpose} pieces have no purpose label.`);

	return problems;
}

/** Removes a piece and every arrow touching it. */
export function withoutPiece(plan: BreakdownPlan, pieceId: string): BreakdownPlan
{
	return { pieces: plan.pieces.filter((piece) => piece.id !== pieceId), edges: plan.edges.filter((edge) => edge.from !== pieceId && edge.to !== pieceId) };
}

/** Adds an arrow unless the same one exists or it points at its own start. */
export function withEdge(plan: BreakdownPlan, from: string, to: string, kind: BreakdownEdgeKind): BreakdownPlan
{
	if (from === to || plan.edges.some((edge) => edge.from === from && edge.to === to && edge.kind === kind)) return plan;

	return { ...plan, edges: [...plan.edges, { from, to, kind }] };
}

/** An authored edge label's arrow kind, by word: "own" owns, "listen" listens to, "spawn" spawns, anything else then (as the grader reads it, A316). */
export function edgeKindFromLabel(label: string): BreakdownEdgeKind
{
	const lower = label.toLowerCase();

	if (lower.includes("own")) return "owns";
	if (lower.includes("listen")) return "listens-to";
	if (lower.includes("spawn")) return "spawns";

	return "then";
}

/** A reference plan in the board's shape, for showing it beside the learner's. Its piece labels double as purposes. */
export function referenceAsPlan(reference: ReferencePlan): BreakdownPlan
{
	return {
		pieces: reference.pieces.map((piece) => ({ id: piece.id, kind: piece.kind, label: piece.label, purpose: piece.label })),
		edges: reference.edges.map((edge) => ({ from: edge.from, to: edge.to, kind: edgeKindFromLabel(edge.label) })),
	};
}
