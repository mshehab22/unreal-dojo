// A child process for the kill test: saves a big file over and over through the real AtomicJsonFile until the parent kills it.
// It imports only AtomicJsonFile and NodeFileSystem (relative paths, no `@shared` alias) so it runs under plain `node --import tsx`.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { AtomicJsonFile } from "../../../src/main/services/progress/AtomicJsonFile";
import { NodeFileSystem } from "../../../src/main/services/progress/NodeFileSystem";

/** The parts of the template save this script changes. The rest of the template is written back as it was read. */
interface TemplateSave
{
	/** The sequence number: the save's XP, which the schema accepts as any whole number from 0. */
	xp: number;

	/** Holds the padding quest, whose saved files carry the bulk of each save. */
	quests: Record<string, { savedFiles: Record<string, string> }>;
}

/** The save file name ProgressStore uses inside the folder. */
const SAVE_FILE_NAME = "progress.json";

/** The quest whose saved file is padded to make each save big. */
const PADDING_QUEST_ID = "pad";

/** The saved file inside the padding quest. */
const PADDING_FILE_NAME = "pad.cpp";

/** The smallest padding, in characters, so every save is at least about 2 MB. */
const MINIMUM_PADDING_LENGTH = 2_000_000;

/** How much the padding varies above the minimum, so saves run from about 2 to 5 MB. */
const PADDING_LENGTH_SPREAD = 3_000_000;

/** A step that scatters the padding length across the spread from one sequence number to the next. */
const PADDING_LENGTH_STEP = 611_393;

/** The padding length for one sequence number: always between 2 and 5 million characters. */
function paddingLengthFor(sequenceNumber: number): number
{
	return MINIMUM_PADDING_LENGTH + ((sequenceNumber * PADDING_LENGTH_STEP) % PADDING_LENGTH_SPREAD);
}

/** Prints one line to stdout and waits until the line has left this process, so a printed number was really reported. */
function printLine(line: string): Promise<void>
{
	return new Promise((resolve) =>
	{
		process.stdout.write(`${line}\n`, () => resolve());
	});
}

/** Saves sequence numbers 1, 2, 3 and so on, printing each number only after its write call returned. Never ends; the parent kills it. */
async function main(): Promise<void>
{
	const [folder, templatePath] = process.argv.slice(2);
	if (!folder || !templatePath) throw new Error("usage: killedSaveWriter <folder> <template save json file>");

	const template = JSON.parse(readFileSync(templatePath, "utf8")) as TemplateSave;
	const file = new AtomicJsonFile(new NodeFileSystem(), folder, join(folder, SAVE_FILE_NAME));

	await printLine("ready");

	for (let sequenceNumber = 1; ; sequenceNumber++)
	{
		const padding = template.quests[PADDING_QUEST_ID];
		if (!padding) throw new Error("the template save has no padding quest");

		padding.savedFiles[PADDING_FILE_NAME] = "x".repeat(paddingLengthFor(sequenceNumber));
		template.xp = sequenceNumber;

		await file.write(template);
		await printLine(String(sequenceNumber));
	}
}

main().catch((error: unknown) =>
{
	process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
	process.exit(1);
});
