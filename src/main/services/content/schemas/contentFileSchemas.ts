// zod schemas for the JSON content files: glossary entries, pattern cards, and pack and world manifests.
import { z } from "zod";

import type { GlossaryEntry, PatternCard } from "@shared/types/content";

import { questionSchema } from "./questionSchemas";
import { text, textList, wholeNumber } from "./schemaHelpers";

/** One glossary entry; the docs link must be https. */
export const glossaryEntrySchema: z.ZodType<GlossaryEntry> = z.strictObject({
	id: text(),
	term: text(),
	aliases: textList(),
	category: text(),
	short: text(),
	long: text(),
	unrealDocsUrl: text().startsWith("https://", { error: "expected an https:// link to Epic's docs" }),
	related: textList(),
	firstQuestId: text().optional(),
	linkMode: z.enum(["code-only"]).optional(),
});

/** One pattern card with its recall and scenario questions. */
export const patternCardSchema: z.ZodType<PatternCard> = z.strictObject({
	id: text(),
	title: text(),
	intent: text(),
	problem: text(),
	unrealForm: text(),
	whenNot: text(),
	useCaseQuestIds: textList(),
	recall: z.array(questionSchema),
	scenarios: z.array(questionSchema),
});

/** `packs/<pack-id>/pack.json`. */
export const packManifestSchema = z.strictObject({
	id: text(),
	title: text(),
	summary: text(),
	order: wholeNumber(1),
});

/** `worlds/<nn-world-id>/world.json`; the order comes from the folder number. */
export const worldManifestSchema = z.strictObject({
	id: text(),
	title: text(),
	summary: text(),
});
