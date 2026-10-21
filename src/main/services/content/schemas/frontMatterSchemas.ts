// zod schemas for quest front matter: the common fields plus each kind's extras. Unknown fields are rejected.
import { z } from "zod";

import type { AuthoredQuestKind, QuestFrontMatter, ScaffoldLevel } from "@shared/types/content";

import { text, textList, wholeNumber } from "./schemaHelpers";

/** Every scaffold level, from most help to none. */
const SCAFFOLD_LEVELS = ["worked", "faded", "stub", "blank"] as const satisfies readonly ScaffoldLevel[];

/** The fields every quest file carries; `kind` is checked before these schemas run. */
const commonFields = {
	id: text(),
	title: text(),
	order: wholeNumber(1),
	difficulty: wholeNumber(1, 5),
	patterns: textList(),
	skills: textList(),
	terms: textList(),
	prerequisites: textList(),
	xp: wholeNumber(0),
	estimatedMinutes: wholeNumber(1),
	concepts: textList(),
};

/** Front matter of a kind with no extra fields. */
const plainFrontMatter = <Kind extends AuthoredQuestKind>(kind: Kind) => z.strictObject({ ...commonFields, kind: z.literal(kind) });

/** Front matter of build and refactor quests, which add a scaffold level. */
const codeFrontMatter = <Kind extends "build" | "refactor">(kind: Kind) => z.strictObject({ ...commonFields, kind: z.literal(kind), scaffold: z.enum(SCAFFOLD_LEVELS) });

/** Front matter schema per authored kind. */
export const FRONT_MATTER_SCHEMAS = {
	concept: plainFrontMatter("concept"),
	breakdown: plainFrontMatter("breakdown"),
	build: codeFrontMatter("build"),
	refactor: codeFrontMatter("refactor"),
	boss: z.strictObject({ ...commonFields, kind: z.literal("boss"), pieces: textList(1) }),
} satisfies Record<AuthoredQuestKind, z.ZodType<QuestFrontMatter>>;
