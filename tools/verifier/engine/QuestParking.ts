// Moves a quest's files out of the verify workspace's build and back, keeping their times, so a returning file is not recompiled (W16, A1322).
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";

import { REMOVE_OPTIONS } from "./removeOptions";
import { entryNames, QUEST_ID } from "./workspaceEntries";

/** The name a parked quest's test file has inside its parked folder. */
const PARKED_TEST_FILE = "Test.cpp";

/** The sub-folder of a parked quest's folder that holds its learner files. */
const PARKED_QUEST_FILES = "Quest";

/** A park in progress fills `<id>.parking`, renamed to `<id>` once every file is in it. */
const PARKING_SUFFIX = ".parking";

/** A return in progress renames `<id>` to `<id>.unparking` before moving any file back. */
const UNPARKING_SUFFIX = ".unparking";

/** Error codes Windows gives while a scanner or indexer briefly holds a file. */
const BUSY_CODES = new Set(["EPERM", "EBUSY", "EACCES"]);

/** Renames that fail with a busy code are tried this many more times. */
const RENAME_RETRIES = 5;

/** The wait between two rename tries. */
const RENAME_RETRY_MILLISECONDS = 200;

/** Whether something exists at `path`. */
async function exists(path: string): Promise<boolean>
{
	return stat(path).then(() => true, () => false);
}

/** `rename`, retried while Windows reports the file busy. */
async function renameWithRetry(from: string, to: string): Promise<void>
{
	for (let attempt = 0; ; attempt++)
	{
		try
		{
			await rename(from, to);

			return;
		}
		catch (error)
		{
			const code = (error as NodeJS.ErrnoException).code ?? "";

			if (attempt >= RENAME_RETRIES || !BUSY_CODES.has(code)) throw error;

			await new Promise((done) => setTimeout(done, RENAME_RETRY_MILLISECONDS));
		}
	}
}

/** The files of one quest in the workspace: its learner folder and its test file. */
export interface QuestLocation
{
	questFolder: string;
	testFile: string;
}

/**
 * Keeps parked quests under one folder (`Saved/VerifierParked` in the workspace, outside `Source`, so UBT does not see them),
 * one folder per quest: `<id>/Quest/<file>` and `<id>/Test.cpp`; a name that is not a quest id (it has a dot) is never a parked quest. A parked folder exists only once a park finished, and a
 * return renames it away before moving anything, so a parked copy is always the last text that stood at its paths and a run
 * killed half way leaves only a `.parking` or `.unparking` folder, which is removed and never restored. That is what makes
 * restoring old times safe: a restored file is either what UBT last compiled at that path or newer than its object.
 */
export class QuestParking
{
	private readonly root: string;

	/** Takes the folder that holds the parked quests. */
	constructor(root: string)
	{
		this.root = root;
	}

	/**
	 * Moves a quest's files into its parked folder and leaves its quest folder in place, empty. A quest with nothing in place is
	 * not touched and keeps the parked copy it has: nothing was written at its paths since that copy was made, since a write
	 * returns it first.
	 */
	async park(questId: string, location: QuestLocation): Promise<void>
	{
		const staging = this.folderOf(questId, PARKING_SUFFIX);
		const inPlace = await entryNames(location.questFolder, (entry) => entry.isFile());

		if (inPlace.length === 0 && !(await exists(location.testFile))) return;

		// An older parked copy, if any, is older than what is in place now.
		await this.discard(questId);
		await mkdir(join(staging, PARKED_QUEST_FILES), { recursive: true });

		for (const name of inPlace)
		{
			await renameWithRetry(join(location.questFolder, name), join(staging, PARKED_QUEST_FILES, name));
		}

		if (await exists(location.testFile)) await renameWithRetry(location.testFile, join(staging, PARKED_TEST_FILE));

		await renameWithRetry(staging, this.folderOf(questId));
		await mkdir(location.questFolder, { recursive: true });
	}

	/** Moves a parked quest's files back with their times; a file already in place wins over its parked copy. */
	async restore(questId: string, location: QuestLocation): Promise<void>
	{
		const returning = this.folderOf(questId, UNPARKING_SUFFIX);

		await rm(returning, REMOVE_OPTIONS);

		if (!(await exists(this.folderOf(questId)))) return;

		await renameWithRetry(this.folderOf(questId), returning);

		for (const name of await entryNames(join(returning, PARKED_QUEST_FILES), (entry) => entry.isFile()))
		{
			await this.moveBack(join(returning, PARKED_QUEST_FILES, name), join(location.questFolder, name));
		}

		await this.moveBack(join(returning, PARKED_TEST_FILE), location.testFile);
		await rm(returning, REMOVE_OPTIONS);
	}

	/** Removes everything parked for a quest, finished or not. */
	async discard(questId: string): Promise<void>
	{
		await rm(this.folderOf(questId), REMOVE_OPTIONS);
		await rm(this.folderOf(questId, PARKING_SUFFIX), REMOVE_OPTIONS);
		await rm(this.folderOf(questId, UNPARKING_SUFFIX), REMOVE_OPTIONS);
	}

	/** The quests with a finished parked folder. */
	async parkedIds(): Promise<string[]>
	{
		return (await entryNames(this.root, (entry) => entry.isDirectory())).filter((name) => QUEST_ID.test(name));
	}

	/** Removes what a killed run left half way (`.parking` and `.unparking` folders) and anything else that is not a parked quest. */
	async removeUnfinished(): Promise<void>
	{
		for (const name of await entryNames(this.root, () => true))
		{
			if (!QUEST_ID.test(name)) await rm(join(this.root, name), REMOVE_OPTIONS);
		}
	}

	/** Moves one parked file back unless a file is already in place, which is newer and stays. */
	private async moveBack(from: string, to: string): Promise<void>
	{
		if (!(await exists(from)) || (await exists(to))) return;

		await mkdir(dirname(to), { recursive: true });
		await renameWithRetry(from, to);
	}

	/** `<root>/<quest-id><suffix>`. */
	private folderOf(questId: string, suffix = ""): string
	{
		return join(this.root, `${questId}${suffix}`);
	}
}
