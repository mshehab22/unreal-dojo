// Reads `content/glossary.json` and `content/patterns.json` into typed entries, reporting each bad entry by index and id.
import type { z } from "zod";

import type { GlossaryEntry, PatternCard } from "@shared/types/content";

import type { ProblemList, ProblemLocation } from "./ProblemList";
import { reportRepeatedIds } from "./reportRepeatedIds";
import { glossaryEntrySchema, patternCardSchema } from "./schemas/contentFileSchemas";
import { validateWith } from "./schemas/validateWith";

/** Parses JSON text that must be a list, reporting malformed JSON or a non-list. */
function parseJsonList(text: string, problems: ProblemList): unknown[] | undefined
{
	let data: unknown;

	try
	{
		data = JSON.parse(text);
	}
	catch (error)
	{
		problems.add(`JSON is malformed: ${error instanceof Error ? error.message : String(error)}`);
		return undefined;
	}

	if (!Array.isArray(data))
	{
		problems.add("expected a JSON list of entries");
		return undefined;
	}

	return data;
}

/** Validates every entry of a JSON list on its own, naming each bad entry by its index and id; `checkEntry` adds checks beyond the schema. */
function readEntries<Entry>(text: string, problems: ProblemList, schema: z.ZodType<Entry>, checkEntry?: (entry: Entry, location: ProblemLocation) => void): Entry[]
{
	const data = parseJsonList(text, problems);

	if (data === undefined) return [];

	const entries: Entry[] = [];

	data.forEach((value, index) =>
	{
		const id = typeof value === "object" && value !== null && "id" in value ? String(value.id) : undefined;
		const section = id === undefined ? `entry ${index}` : `entry ${index} (${id})`;
		const before = problems.count;
		const entry = validateWith(schema, value, problems, { section }, `[${index}]`);

		if (entry === undefined) return;

		checkEntry?.(entry, { section });

		if (problems.count === before) entries.push(entry);
	});

	return entries;
}

/** Reads the glossary file's text. Entries with problems are left out and reported. */
export function readGlossary(text: string, problems: ProblemList): GlossaryEntry[]
{
	return readEntries(text, problems, glossaryEntrySchema);
}

/** Reads the pattern cards file's text. Entries with problems are left out and reported. */
export function readPatterns(text: string, problems: ProblemList): PatternCard[]
{
	return readEntries(text, problems, patternCardSchema, (card, location) =>
	{
		const questionIds = [...card.recall, ...card.scenarios].map((question) => question.id);

		reportRepeatedIds(questionIds, "question", "this pattern card", problems, location);
	});
}
