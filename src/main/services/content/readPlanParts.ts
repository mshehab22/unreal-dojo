// Reads breakdown and boss plan data: required pieces and reference plans, with their cross references checked.
import type { PieceKind, PlanEdge, PlanPiece, ReferencePlan, RequiredPiece } from "@shared/types/content";

import type { ObjectReader } from "./ObjectReader";

/** Every piece kind, in the order they are listed in error messages. */
export const PIECE_KINDS: readonly PieceKind[] = ["class", "component", "data", "event", "step"];

/** Reads one required piece. The caller calls `reader.finish()`. */
export function readRequiredPiece(reader: ObjectReader): RequiredPiece
{
	return {
		id: reader.string("id"),
		kind: reader.oneOf("kind", PIECE_KINDS),
		label: reader.string("label"),
		why: reader.string("why"),
	};
}

/** Reads one piece of a reference plan. */
function readPlanPiece(reader: ObjectReader): PlanPiece
{
	return {
		id: reader.string("id"),
		kind: reader.oneOf("kind", PIECE_KINDS),
		label: reader.string("label"),
		covers: reader.stringList("covers"),
	};
}

/** Reads one labeled edge of a reference plan. */
function readPlanEdge(reader: ObjectReader): PlanEdge
{
	return { from: reader.string("from"), to: reader.string("to"), label: reader.string("label") };
}

/**
 * Returns a reader for reference plans that also checks each plan's references: every `covers` id must be a
 * required piece, and every edge must join two pieces of the same plan.
 */
export function createReferencePlanReader(requiredPieceIds: ReadonlySet<string>): (reader: ObjectReader) => ReferencePlan
{
	return (reader) =>
	{
		const id = reader.string("id");
		const title = reader.string("title");
		const pieces = reader.objectList("pieces", readPlanPiece);
		const edges = reader.objectList("edges", readPlanEdge, true);
		const pieceIds = new Set(pieces.map((piece) => piece.id));

		for (const piece of pieces)
		{
			for (const covered of piece.covers)
			{
				if (!requiredPieceIds.has(covered)) reader.report("pieces", `piece "${piece.id}" covers "${covered}", which is not a required piece id`);
			}
		}

		for (const edge of edges)
		{
			if (!pieceIds.has(edge.from)) reader.report("edges", `edge from "${edge.from}" does not name a piece in this plan`);
			if (!pieceIds.has(edge.to)) reader.report("edges", `edge to "${edge.to}" does not name a piece in this plan`);
		}

		return { id, title, pieces, edges };
	};
}
