// An in-memory FileSystem for tests, with switches that simulate a crash at a chosen step of a write.
import type { FileSystem } from "../../src/main/services/progress/FileSystem";

/** The write steps a test can make fail. */
export type CrashPoint = "none" | "mid-temp-write" | "before-rename";

/** Keeps files in a map. `crashAt` makes the next write fail at that step, like a power cut. */
export class MemoryFileSystem implements FileSystem
{
	/** File contents by path. */
	readonly files = new Map<string, string>();

	/** Where the next write crashes. Resets to "none" after one crash. */
	crashAt: CrashPoint = "none";

	/** When set, every read fails with this node:fs code (for example EBUSY), like a file held by another program. */
	readErrorCode: string | null = null;

	/** Reads a file or rejects with ENOENT. */
	async readText(path: string): Promise<string>
	{
		if (this.readErrorCode) throw Object.assign(new Error(`${this.readErrorCode}: ${path}`), { code: this.readErrorCode });

		const text = this.files.get(path);
		if (text === undefined) throw Object.assign(new Error(`ENOENT: ${path}`), { code: "ENOENT" });

		return text;
	}

	/** Writes a file. On a "mid-temp-write" crash, half the text lands and the write throws. */
	async writeTextDurably(path: string, text: string): Promise<void>
	{
		if (this.crashAt === "mid-temp-write")
		{
			this.crashAt = "none";
			this.files.set(path, text.slice(0, Math.floor(text.length / 2)));
			throw new Error("simulated crash while writing");
		}

		this.files.set(path, text);
	}

	/** Moves a file. On a "before-rename" crash, the move never happens. */
	async rename(fromPath: string, toPath: string): Promise<void>
	{
		if (this.crashAt === "before-rename")
		{
			this.crashAt = "none";
			throw new Error("simulated crash before rename");
		}

		const text = await this.readText(fromPath);
		this.files.set(toPath, text);
		this.files.delete(fromPath);
	}

	/** Copies a file. */
	async copy(fromPath: string, toPath: string): Promise<void>
	{
		this.files.set(toPath, await this.readText(fromPath));
	}

	/** Deletes a file if present. */
	async removeIfPresent(path: string): Promise<void>
	{
		this.files.delete(path);
	}

	/** Folders are implicit in a map. */
	async ensureFolder(): Promise<void>
	{}
}
