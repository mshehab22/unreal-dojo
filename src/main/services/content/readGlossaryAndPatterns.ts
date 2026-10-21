// Reads `content/glossary.json` and `content/patterns.json` into typed entries, reporting each bad entry by index and id.
import type { GlossaryEntry, PatternCard } from "@shared/types/content";

import { ObjectReader } from "./ObjectReader";
import type { ProblemList } from "./ProblemList";
import { readQuestion } from "./readQuestion";

/** Reads one glossary entry. */
function readGlossaryEntry(reader: ObjectReader): GlossaryEntry
{
	const entry: GlossaryEntry = {
		id: reader.string("id"),
		term: reader.string("term"),
		aliases: reader.stringList("aliases"),
		category: reader.string("category"),
		short: reader.string("short"),
		long: reader.string("long"),
		unrealDocsUrl: reader.string("unrealDocsUrl"),
		related: reader.stringList("related"),
	};

	const firstQuestId = reader.optionalString("firstQuestId");

	if (firstQuestId !== undefined) entry.firstQuestId = firstQuestId;
	if (entry.unrealDocsUrl && !entry.unrealDocsUrl.startsWith("https://")) reader.report("unrealDocsUrl", "expected an https:// link to Epic's docs");

	return entry;
}

/** Reads one pattern card with its recall and scenario questions. */
function readPatternCard(reader: ObjectReader): PatternCard
{
	return {
		id: reader.string("id"),
		title: reader.string("title"),
		intent: reader.string("intent"),
		problem: reader.string("problem"),
		unrealForm: reader.string("unrealForm"),
		whenNot: reader.string("whenNot"),
		useCaseQuestIds: reader.stringList("useCaseQuestIds"),
		recall: reader.objectList("recall", (question) => readQuestion(question), true),
		scenarios: reader.objectList("scenarios", (question) => readQuestion(question), true),
	};
}

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

/** Reads every entry of a JSON list, naming each entry by its id (or index) in problem messages. */
function readEntries<Entry>(text: string, problems: ProblemList, readEntry: (reader: ObjectReader) => Entry): Entry[]
{
	const data = parseJsonList(text, problems);

	if (data === undefined) return [];

	const entries: Entry[] = [];

	data.forEach((value, index) =>
	{
		const id = typeof value === "object" && value !== null && "id" in value ? String(value.id) : undefined;
		const name = id === undefined ? `entry ${index}` : `entry ${index} (${id})`;
		const before = problems.count;
		const reader = ObjectReader.from(value, `[${index}]`, problems, { section: name });

		if (reader === undefined) return;

		const entry = readEntry(reader);
		reader.finish();

		if (problems.count === before) entries.push(entry);
	});

	return entries;
}

/** Reads the glossary file's text. Entries with problems are left out and reported. */
export function readGlossary(text: string, problems: ProblemList): GlossaryEntry[]
{
	return readEntries(text, problems, readGlossaryEntry);
}

/** Reads the pattern cards file's text. Entries with problems are left out and reported. */
export function readPatterns(text: string, problems: ProblemList): PatternCard[]
{
	return readEntries(text, problems, readPatternCard);
}
