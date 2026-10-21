// zod schemas for breakdown and boss plans (required pieces, reference plans) and Parsons blocks.
import { z } from "zod";

import type { ParsonsBlock, PieceKind, ReferencePlan, RequiredPiece } from "@shared/types/content";

import { text, textList } from "./schemaHelpers";

/** Every piece kind, in the order they are listed in error messages. */
const PIECE_KINDS = ["class", "component", "data", "event", "step"] as const satisfies readonly PieceKind[];

/** A piece the grader must find in the learner's plan. */
export const requiredPieceSchema: z.ZodType<RequiredPiece> = z.strictObject({
	id: text(),
	kind: z.enum(PIECE_KINDS),
	label: text(),
	why: text(),
});

/** One valid plan. Its cross references (edges and `covers`) are checked by the quest parser after parsing. */
export const referencePlanSchema: z.ZodType<ReferencePlan> = z.strictObject({
	id: text(),
	title: text(),
	pieces: z.array(z.strictObject({ id: text(), kind: z.enum(PIECE_KINDS), label: text(), covers: textList() })).min(1),
	edges: z.array(z.strictObject({ from: text(), to: text(), label: text() })),
});

/** A reorder-the-lines drill item. */
export const parsonsSchema: z.ZodType<ParsonsBlock> = z.strictObject({
	id: text(),
	prompt: text(),
	lines: textList(1),
	distractors: z.array(z.strictObject({ line: text(), mistake: text() })).min(1),
});
