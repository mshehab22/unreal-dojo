// Reads a quest's reference solution files, which fill prerequisite quests the learner skipped or reset (A65).
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
