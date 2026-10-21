// The real file operations, on node:fs/promises, with Windows lock retries and a folder flush after renames on macOS and Linux.
import { copyFile, mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { setTimeout as wait } from "node:timers/promises";

import type { FileSystem } from "./FileSystem";
import { retryWhileLocked, type RetryOptions } from "./retryWhileLocked";

/** FileSystem on the computer's disk. */
export class NodeFileSystem implements FileSystem
{
	/** Builds it for a platform (the real one by default). */
	constructor(private readonly retryOptions: RetryOptions = { platform: process.platform, sleep: async (milliseconds) => { await wait(milliseconds); } })
	{}

	/** Reads a whole UTF-8 file, retrying a brief Windows lock. */
	readText(path: string): Promise<string>
	{
		return retryWhileLocked(() => readFile(path, "utf8"), this.retryOptions);
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

	/** Renames a file, replacing the destination, retrying a brief Windows lock; on macOS and Linux it then flushes the folder so the rename itself survives a power cut. */
	async rename(fromPath: string, toPath: string): Promise<void>
	{
		await retryWhileLocked(() => rename(fromPath, toPath), this.retryOptions);

		if (this.retryOptions.platform !== "win32") await this.flushFolder(dirname(toPath));
	}

	/** Copies a file, replacing the destination, retrying a brief Windows lock. */
	copy(fromPath: string, toPath: string): Promise<void>
	{
		return retryWhileLocked(() => copyFile(fromPath, toPath), this.retryOptions);
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

	/** Fsyncs a folder. Best effort: some file systems refuse it, and the data file itself is already flushed. */
	private async flushFolder(folder: string): Promise<void>
	{
		try
		{
			const handle = await open(folder, "r");

			try
			{
				await handle.sync();
			}
			finally
			{
				await handle.close();
			}
		}
		catch
		{
			// A folder that cannot be flushed still holds the renamed file; nothing to recover.
		}
	}
}
