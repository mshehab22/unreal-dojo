// A sandbox file system for the verify workspace that leaves a file alone when it already holds the wanted bytes (W16, A1320).
import { readFile } from "node:fs/promises";

import type { SandboxFileSystem } from "../../../src/main/services/unreal/SandboxFileSystem";

/**
 * Wraps another SandboxFileSystem and skips a write whose text, as UTF-8 bytes, matches the file on disk exactly, so its
 * modification time stays older than its last compile and UBT does not rebuild it. Any other write, and every other call,
 * goes to the wrapped file system unchanged, so a file whose bytes differ still gets a fresh time and is rebuilt. The bytes on
 * disk are read with `node:fs`, not the wrapped `readTextFile` (which drops a byte order mark), so it is meant for a real disk.
 */
export class KeepUnchangedFileSystem implements SandboxFileSystem
{
	private readonly inner: SandboxFileSystem;

	/** Takes the file system that does the real work. */
	constructor(inner: SandboxFileSystem)
	{
		this.inner = inner;
	}

	/** Reads through the wrapped file system. */
	readTextFile(filePath: string): Promise<string | null>
	{
		return this.inner.readTextFile(filePath);
	}

	/** Writes through the wrapped file system unless the file already holds exactly these bytes (a byte order mark counts as a difference). */
	async writeTextFile(filePath: string, text: string): Promise<void>
	{
		const existing = await readFile(filePath).catch(() => undefined);

		if (existing !== undefined && existing.equals(Buffer.from(text, "utf8"))) return;

		await this.inner.writeTextFile(filePath, text);
	}

	/** Removes through the wrapped file system. */
	removeFile(filePath: string): Promise<void>
	{
		return this.inner.removeFile(filePath);
	}

	/** Removes through the wrapped file system. */
	removeFolder(folderPath: string): Promise<void>
	{
		return this.inner.removeFolder(folderPath);
	}

	/** Lists through the wrapped file system. */
	listFiles(folderPath: string): Promise<string[]>
	{
		return this.inner.listFiles(folderPath);
	}

	/** Lists through the wrapped file system. */
	listEntries(folderPath: string): Promise<string[]>
	{
		return this.inner.listEntries(folderPath);
	}

	/** Copies through the wrapped file system (every copied file gets the current time). */
	copyFolder(fromFolder: string, toFolder: string, skipNames: string[]): Promise<void>
	{
		return this.inner.copyFolder(fromFolder, toFolder, skipNames);
	}

	/** Makes folders through the wrapped file system. */
	makeFolder(folderPath: string): Promise<void>
	{
		return this.inner.makeFolder(folderPath);
	}

	/** Resolves through the wrapped file system. */
	realPath(folderPath: string): Promise<string>
	{
		return this.inner.realPath(folderPath);
	}

	/** Makes a temporary folder through the wrapped file system. */
	makeTemporaryFolder(prefix: string): Promise<string>
	{
		return this.inner.makeTemporaryFolder(prefix);
	}
}
