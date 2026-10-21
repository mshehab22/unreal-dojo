// Writes a quest's learner files and tests into the sandbox, always as fresh files.
import type { PlatformPaths } from "./PlatformPaths";
import type { SandboxFileSystem } from "./SandboxFileSystem";

/** The parts of a quest the writer needs. */
export interface QuestForWriting
{
	id: string;
	title: string;

	/** The quest's automation test source. */
	tests: string;
}

/** A file name the learner may use: letters, digits, `_`, `-`, `.`, ending in `.h` or `.cpp`, no folders. */
const SAFE_FILE_NAME = /^[A-Za-z0-9_][A-Za-z0-9_.-]*\.(h|cpp)$/;

/** A quest id usable as a folder name. */
const SAFE_QUEST_ID = /^[a-z0-9][a-z0-9-]*$/;

/** Learner files go to `Source/Dojo/Quests/<quest-id>/`, tests to `Source/Dojo/Tests/<quest-id>.Test.cpp`. */
export class QuestFileWriter
{
	private readonly paths: PlatformPaths;
	private readonly fileSystem: SandboxFileSystem;

	/** Takes the platform's paths and the file system. */
	constructor(paths: PlatformPaths, fileSystem: SandboxFileSystem)
	{
		this.paths = paths;
		this.fileSystem = fileSystem;
	}

	/** `<sandbox>/Source/Dojo/Quests/<quest-id>`. */
	questFolder(sandboxFolder: string, questId: string): string
	{
		return this.paths.join(sandboxFolder, "Source", "Dojo", "Quests", questId);
	}

	/** `<sandbox>/Source/Dojo/Tests/<quest-id>.Test.cpp`. */
	testFile(sandboxFolder: string, questId: string): string
	{
		return this.paths.join(sandboxFolder, "Source", "Dojo", "Tests", `${questId}.Test.cpp`);
	}

	/** Writes every learner file and the test file fresh, and removes files left in the quest folder from an earlier run. Throws on an unsafe id or file name. */
	async write(sandboxFolder: string, quest: QuestForWriting, files: Record<string, string>): Promise<void>
	{
		// Learner files are written unchanged so compiler line numbers match the editor.
		await this.writeLearnerFiles(sandboxFolder, quest.id, files);

		await this.fileSystem.writeTextFile(this.testFile(sandboxFolder, quest.id), `// Quest test: ${quest.id} (${quest.title}). Written by Unreal Dojo; edits here are replaced on the next run.\n${quest.tests}`);
	}

	/** Writes only a quest's learner files, fresh, replacing the folder's contents; used to fill a prerequisite quest from its reference solution (A65). */
	async writeLearnerFiles(sandboxFolder: string, questId: string, files: Record<string, string>): Promise<void>
	{
		assertSafeQuestId(questId);

		const fileNames = Object.keys(files);
		for (const fileName of fileNames) assertSafeFileName(fileName);

		const questFolder = this.questFolder(sandboxFolder, questId);

		for (const leftover of await this.fileSystem.listFiles(questFolder))
		{
			if (!fileNames.includes(leftover)) await this.fileSystem.removeFile(this.paths.join(questFolder, leftover));
		}

		for (const fileName of fileNames) await this.fileSystem.writeTextFile(this.paths.join(questFolder, fileName), files[fileName] ?? "");
	}

	/** The learner file names currently in a quest's sandbox folder. */
	async existingLearnerFiles(sandboxFolder: string, questId: string): Promise<string[]>
	{
		assertSafeQuestId(questId);

		return this.fileSystem.listFiles(this.questFolder(sandboxFolder, questId));
	}

	/** Removes a quest's folder and test file, for a quest reset. */
	async remove(sandboxFolder: string, questId: string): Promise<void>
	{
		assertSafeQuestId(questId);

		await this.fileSystem.removeFolder(this.questFolder(sandboxFolder, questId));
		await this.fileSystem.removeFile(this.testFile(sandboxFolder, questId));
	}
}

/** Throws when a quest id could escape the Quests folder. */
function assertSafeQuestId(questId: string): void
{
	if (!SAFE_QUEST_ID.test(questId)) throw new Error(`Unsafe quest id for a sandbox folder: ${questId}`);
}

/** Throws when a learner file name is a path or not C++ source. */
function assertSafeFileName(fileName: string): void
{
	if (!SAFE_FILE_NAME.test(fileName) || fileName.includes("..")) throw new Error(`Unsafe quest file name: ${fileName}`);
}
