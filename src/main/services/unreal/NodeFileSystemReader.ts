// The real FileSystemReader, backed by node:fs.
import { readdir, readFile } from "node:fs/promises";

import type { FileSystemReader } from "./FileSystemReader";

/** Reads the real disk. Missing or unreadable paths answer null or an empty list, as the interface promises. */
export class NodeFileSystemReader implements FileSystemReader
{
	/** Reads a UTF-8 file and strips a leading byte order mark (Epic's JSON files sometimes carry one). */
	async readTextFile(filePath: string): Promise<string | null>
	{
		try
		{
			const text = await readFile(filePath, "utf8");

			return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
		}
		catch
		{
			return null;
		}
	}

	/** Lists child folder names, following symbolic links the way Finder and Explorer show them. */
	async listFolders(folderPath: string): Promise<string[]>
	{
		try
		{
			const entries = await readdir(folderPath, { withFileTypes: true });

			return entries.filter((entry) => entry.isDirectory() || entry.isSymbolicLink()).map((entry) => entry.name);
		}
		catch
		{
			return [];
		}
	}
}
