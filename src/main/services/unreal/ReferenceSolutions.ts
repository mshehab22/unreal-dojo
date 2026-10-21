// Reads a quest's reference solution files, which fill prerequisite quests the learner skipped or reset (A65).
import { type BossFolderReader, readBossSolution } from "./bossSolution";
import type { PlatformPaths } from "./PlatformPaths";
import type { SandboxFileSystem } from "./SandboxFileSystem";

/** Reference solutions laid out as `<root>/<quest-id>/<FileName>`, the `tools/solutions/` layout the verifier compiles. */
export class ReferenceSolutions
{
	private readonly paths: PlatformPaths;
	private readonly fileSystem: SandboxFileSystem;
	private readonly rootFolder: string;

	/** Takes the platform's paths, the file system, and the solutions folder. */
	constructor(paths: PlatformPaths, fileSystem: SandboxFileSystem, rootFolder: string)
	{
		this.paths = paths;
		this.fileSystem = fileSystem;
		this.rootFolder = rootFolder;
	}

	/** A boss's integration code (no tests) and its piece overrides by piece quest id, read with the verifier's layout reader (A215); null when there is none. */
	async bossOf(bossId: string): Promise<{ code: Record<string, string>; overrides: Record<string, Record<string, string>> } | null>
	{
		const boss = await readBossSolution(this.rootFolder, bossId, this.folderReader());
		if (!boss) return null;

		const asMap = (files: { name: string; text: string }[]): Record<string, string> => Object.fromEntries(files.map((file) => [file.name, file.text]));

		return { code: asMap(boss.code), overrides: Object.fromEntries([...boss.overrides].map(([pieceId, files]) => [pieceId, asMap(files)])) };
	}

	/** The boss reader's view of this file system. */
	private folderReader(): BossFolderReader
	{
		const fileSystem = this.fileSystem;

		return {
			listFolder: async (folder) =>
			{
				const entries = await fileSystem.listEntries(folder);
				if (entries.length === 0) return undefined;

				const files = await fileSystem.listFiles(folder);

				return { files, folders: entries.filter((name) => !files.includes(name)) };
			},
			readText: async (filePath) => (await fileSystem.readTextFile(filePath)) ?? "",
		};
	}

	/** The quest's reference files by name, or null when the quest has no reference solution. */
	async filesOf(questId: string): Promise<Record<string, string> | null>
	{
		const questFolder = this.paths.join(this.rootFolder, questId);
		const fileNames = await this.fileSystem.listFiles(questFolder);
		if (fileNames.length === 0) return null;

		const files: Record<string, string> = {};

		for (const fileName of fileNames.sort())
		{
			const text = await this.fileSystem.readTextFile(this.paths.join(questFolder, fileName));
			if (text !== null) files[fileName] = text;
		}

		return files;
	}
}
