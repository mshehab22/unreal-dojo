// The real file operations, on node:fs/promises.
import { copyFile, mkdir, open, readFile, rename, rm } from "node:fs/promises";

import type { FileSystem } from "./FileSystem";

/** FileSystem on the computer's disk. */
export class NodeFileSystem implements FileSystem
{
	/** Reads a whole UTF-8 file. */
	readText(path: string): Promise<string>
	{
		return readFile(path, "utf8");
	}

	/** Writes the file, then fsyncs it so a power cut cannot leave the rename pointing at unwritten data. */
	async writeTextDurably(path: string, text: string): Promise<void>
	{
		const handle = await open(path, "w");

		try
		{
			await handle.writeFile(text, "utf8");
			await handle.sync();
		}
		finally
		{
			await handle.close();
		}
	}

	/** Renames a file, replacing the destination. */
	rename(fromPath: string, toPath: string): Promise<void>
	{
		return rename(fromPath, toPath);
	}

	/** Copies a file, replacing the destination. */
	copy(fromPath: string, toPath: string): Promise<void>
	{
		return copyFile(fromPath, toPath);
	}

	/** Deletes a file if it exists. */
	removeIfPresent(path: string): Promise<void>
	{
		return rm(path, { force: true });
	}

	/** Creates a folder and its parents if missing. */
	async ensureFolder(path: string): Promise<void>
	{
		await mkdir(path, { recursive: true });
	}
}
