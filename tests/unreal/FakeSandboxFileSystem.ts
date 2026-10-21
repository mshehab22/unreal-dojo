// An in-memory SandboxFileSystem with forward-slash paths.
import type { SandboxFileSystem } from "../../src/main/services/unreal/SandboxFileSystem";

/** Holds files by full path. Folders exist implicitly when a file is under them, or explicitly after makeFolder. */
export class FakeSandboxFileSystem implements SandboxFileSystem
{
	/** File texts by full path. */
	readonly files = new Map<string, string>();

	/** Every write, in order, so tests can check that files were written fresh. */
	readonly writes: string[] = [];

	/** Every removed folder, in order. */
	readonly removedFolders: string[] = [];

	private readonly folders = new Set<string>();
	private temporaryCount = 0;

	/** Takes the starting files. */
	constructor(files: Record<string, string> = {})
	{
		for (const [filePath, text] of Object.entries(files)) this.files.set(filePath, text);
	}

	/** Returns the text without a byte order mark, or null. */
	async readTextFile(filePath: string): Promise<string | null>
	{
		const text = this.files.get(filePath);
		if (text === undefined) return null;

		return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
	}

	/** Stores the text. */
	async writeTextFile(filePath: string, text: string): Promise<void>
	{
		this.writes.push(filePath);
		this.files.set(filePath, text);
	}

	/** Deletes a file. */
	async removeFile(filePath: string): Promise<void>
	{
		this.files.delete(filePath);
	}

	/** Deletes every file under the folder. */
	async removeFolder(folderPath: string): Promise<void>
	{
		this.removedFolders.push(folderPath);

		for (const filePath of [...this.files.keys()]) if (filePath.startsWith(`${folderPath}/`)) this.files.delete(filePath);

		this.folders.delete(folderPath);
	}

	/** Names of files directly inside the folder. */
	async listFiles(folderPath: string): Promise<string[]>
	{
		return [...this.files.keys()].filter((filePath) => filePath.startsWith(`${folderPath}/`) && !filePath.slice(folderPath.length + 1).includes("/")).map((filePath) => filePath.slice(folderPath.length + 1));
	}

	/** Names of files and folders directly inside the folder. */
	async listEntries(folderPath: string): Promise<string[]>
	{
		const names = [...this.files.keys()].filter((filePath) => filePath.startsWith(`${folderPath}/`)).map((filePath) => filePath.slice(folderPath.length + 1).split("/")[0] ?? "");

		return [...new Set(names)];
	}

	/** Copies every file under `fromFolder`, skipping top-level names. */
	async copyFolder(fromFolder: string, toFolder: string, skipNames: string[]): Promise<void>
	{
		for (const [filePath, text] of [...this.files])
		{
			if (!filePath.startsWith(`${fromFolder}/`)) continue;

			const relativePath = filePath.slice(fromFolder.length + 1);
			if (skipNames.includes(relativePath.split("/")[0] ?? "")) continue;

			this.files.set(`${toFolder}/${relativePath}`, text);
		}
	}

	/** Records the folder. */
	async makeFolder(folderPath: string): Promise<void>
	{
		this.folders.add(folderPath);
	}

	/** Resolved paths by path; anything not listed is already real. */
	readonly links = new Map<string, string>();

	/** Answers from `links`, else the path itself. */
	async realPath(folderPath: string): Promise<string>
	{
		return this.links.get(folderPath) ?? folderPath;
	}

	/** Returns `/tmp/<prefix><n>`. */
	async makeTemporaryFolder(prefix: string): Promise<string>
	{
		this.temporaryCount++;

		return `/tmp/${prefix}${this.temporaryCount}`;
	}
}
