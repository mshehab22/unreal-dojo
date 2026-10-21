// Reads `content/glossary.json` and `content/patterns.json` into typed entries, reporting each bad entry by index and id.
import type { z } from "zod";

import type { GlossaryEntry, PatternCard } from "@shared/types/content";

import type { ProblemList } from "./ProblemList";
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

/** Validates every entry of a JSON list on its own, naming each bad entry by its index and id. */
function readEntries<Entry>(text: string, problems: ProblemList, schema: z.ZodType<Entry>): Entry[]
{
	const data = parseJsonList(text, problems);

	if (data === undefined) return [];

	const entries: Entry[] = [];

	data.forEach((value, index) =>
	{
		const id = typeof value === "object" && value !== null && "id" in value ? String(value.id) : undefined;
		const section = id === undefined ? `entry ${index}` : `entry ${index} (${id})`;
		const entry = validateWith(schema, value, problems, { section }, `[${index}]`);

		if (entry !== undefined) entries.push(entry);
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
	return readEntries(text, problems, patternCardSchema);
}
