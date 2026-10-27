// A JSON file written crash-safely: write a temp file, flush it, keep the old file as a backup (copied aside then renamed, so it is never torn), then rename over the original.
import type { FileSystem } from "./FileSystem";
import { errorCode } from "./retryWhileLocked";

/** What reading one of the three files found. */
/** "unreadable" is a file whose text is not JSON; "io-error" is a file the disk refused to read (locked, no permission). */
export type JsonReadResult = { kind: "missing" } | { kind: "unreadable"; reason: string } | { kind: "io-error"; reason: string; code?: string } | { kind: "read"; value: unknown };

/**
 * One JSON file with a `.tmp` sibling for writes and a `.bak` sibling holding the previous good version. Writes are serialized.
 * A `.tmp` or `.bak.tmp` left by a killed process is never read: loading looks only at the main file and the `.bak`, and the next write overwrites the leftovers (A1193).
 */
export class AtomicJsonFile
{
	/** The temp file each write goes to first. */
	readonly temporaryPath: string;

	/** The previous good version, kept for recovery. */
	readonly backupPath: string;

	/** Where the backup is copied to first, then renamed to `backupPath`, so a kill mid-copy never leaves a torn backup. */
	readonly backupTemporaryPath: string;

	/** The last queued write, so writes never overlap. */
	private pendingWrite: Promise<void> = Promise.resolve();

	/** Wraps the file at `path` inside `folder`. */
	constructor(
		private readonly fileSystem: FileSystem,
		private readonly folder: string,
		readonly path: string,
	)
	{
		this.temporaryPath = `${path}.tmp`;
		this.backupPath = `${path}.bak`;
		this.backupTemporaryPath = `${path}.bak.tmp`;
	}

	/** Reads and parses the main file. */
	read(): Promise<JsonReadResult>
	{
		return this.readAt(this.path);
	}

	/** Reads and parses the backup file. */
	readBackup(): Promise<JsonReadResult>
	{
		return this.readAt(this.backupPath);
	}

	/** Writes `value` crash-safely. A crash at any step leaves either the old file or the new one in place, never a half-written one. */
	write(value: unknown): Promise<void>
	{
		const text = `${JSON.stringify(value, null, "\t")}\n`;
		const next = this.pendingWrite.catch(() => undefined).then(() => this.writeNow(text));

		this.pendingWrite = next;

		return next;
	}

	/** Moves the main file aside as `<path>.corrupt-<stamp>` so a bad save is kept for inspection, not overwritten. */
	async quarantine(stamp: string): Promise<string>
	{
		const quarantinePath = `${this.path}.corrupt-${stamp}`;
		await this.fileSystem.rename(this.path, quarantinePath);

		return quarantinePath;
	}

	/** The write steps: temp file (flushed), backup of the current file (copied to `.bak.tmp`, then renamed), rename. */
	private async writeNow(text: string): Promise<void>
	{
		await this.fileSystem.ensureFolder(this.folder);
		await this.fileSystem.writeTextDurably(this.temporaryPath, text);

		const current = await this.read();

		if (current.kind === "read")
		{
			await this.fileSystem.copy(this.path, this.backupTemporaryPath);
			await this.fileSystem.rename(this.backupTemporaryPath, this.backupPath);
		}

		await this.fileSystem.rename(this.temporaryPath, this.path);
	}

	/** Reads and parses one file. */
	private async readAt(path: string): Promise<JsonReadResult>
	{
		let text: string;

		try
		{
			text = await this.fileSystem.readText(path);
		}
		catch (error)
		{
			const code = errorCode(error);
			if (code === "ENOENT") return { kind: "missing" };

			const reason = error instanceof Error ? error.message : String(error);

			return code === undefined ? { kind: "io-error", reason } : { kind: "io-error", reason, code };
		}

		try
		{
			return { kind: "read", value: JSON.parse(text) as unknown };
		}
		catch (error)
		{
			return { kind: "unreadable", reason: error instanceof Error ? error.message : String(error) };
		}
	}
}
