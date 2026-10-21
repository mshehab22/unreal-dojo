// An in-memory FileSystemReader for the engine locator tests.
import type { FileSystemReader } from "../../src/main/services/unreal/FileSystemReader";

/** Answers from a map of file texts and a map of folder listings. Anything not in the maps is missing. */
export class FakeFileSystemReader implements FileSystemReader
{
	/** Every path read, in order, so tests can check what was looked at. */
	readonly readPaths: string[] = [];

	private readonly files: Record<string, string>;
	private readonly folders: Record<string, string[]>;

	/** Takes file texts by full path and child folder names by folder path. */
	constructor(files: Record<string, string>, folders: Record<string, string[]> = {})
	{
		this.files = files;
		this.folders = folders;
	}

	/** Returns the file's text or null, stripping a byte order mark like the real reader. */
	async readTextFile(filePath: string): Promise<string | null>
	{
		this.readPaths.push(filePath);

		const text = this.files[filePath];
		if (text === undefined) return null;

		return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
	}

	/** Returns the listed folder names or an empty list. */
	async listFolders(folderPath: string): Promise<string[]>
	{
		return this.folders[folderPath] ?? [];
	}
}
