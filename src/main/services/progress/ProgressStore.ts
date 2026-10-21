// Loads and saves `<userData>/progress.json`: validates it, recovers from a corrupt file, and writes atomically. Main process only (D06).
import { join } from "node:path";

import type { PlayerProgress } from "@shared/types/progress";

import { AppErrorException } from "../../errors/AppErrorException";
import { AtomicJsonFile, type JsonReadResult } from "./AtomicJsonFile";
import { createNewProgress } from "./createNewProgress";
import type { FileSystem } from "./FileSystem";
import { playerProgressSchema } from "./progressSchema";
import { SAVE_VERSION } from "./rules";

/** The save file name inside the user data folder. */
export const SAVE_FILE_NAME = "progress.json";

/** How a load went. */
export interface LoadedProgress
{
	/** The progress to use. */
	progress: PlayerProgress;

	/** "none" for a clean load or a first start; "backup" when the main file was bad and the backup was used; "fresh" when both were bad. */
	recovery: "none" | "backup" | "fresh";

	/** Where the bad main file was moved, when it was. */
	quarantinedPath?: string;
}

/** The save file on disk. */
export class ProgressStore
{
	/** The atomic JSON file underneath. */
	private readonly file: AtomicJsonFile;

	/** Uses `<folder>/progress.json`. */
	constructor(fileSystem: FileSystem, folder: string)
	{
		this.file = new AtomicJsonFile(fileSystem, folder, join(folder, SAVE_FILE_NAME));
	}

	/**
	 * Loads the save. Missing: a fresh save. Not JSON or not a save: the bad file is quarantined and the backup is used, else a fresh save.
	 * A file the disk will not read (locked, no permission) and a save from a newer app version are refused with `save-failed`, never quarantined or overwritten.
	 */
	async load(now: Date): Promise<LoadedProgress>
	{
		const main = await this.file.read();
		this.refuseIoError(main);
		if (main.kind === "missing") return this.loadBackupOrFresh(now, "none");

		const parsed = main.kind === "read" ? this.parse(main.value) : null;
		if (parsed) return { progress: parsed, recovery: "none" };

		const quarantinedPath = await this.file.quarantine(now.toISOString().replace(/[:.]/g, "-"));
		const recovered = await this.loadBackupOrFresh(now, "backup");

		return { ...recovered, quarantinedPath };
	}

	/** Writes the save atomically. Turns a disk failure into a `save-failed` AppError. */
	async save(progress: PlayerProgress): Promise<void>
	{
		try
		{
			await this.file.write(progress);
		}
		catch (error)
		{
			throw new AppErrorException("save-failed", "Your progress could not be saved.", "Check that the disk has free space, then try again.", error instanceof Error ? error.message : String(error));
		}
	}

	/** Tries the backup (after a missing or bad main file), falling back to a fresh save. */
	private async loadBackupOrFresh(now: Date, recoveryIfBackup: "none" | "backup"): Promise<LoadedProgress>
	{
		const backup = await this.file.readBackup();
		this.refuseIoError(backup);
		const parsed = backup.kind === "read" ? this.parse(backup.value) : null;

		if (parsed) return { progress: parsed, recovery: "backup" };

		return { progress: createNewProgress(now), recovery: recoveryIfBackup === "none" && backup.kind === "missing" ? "none" : "fresh" };
	}

	/** Throws `save-failed` for a file the disk refused to read, so a locked save is never mistaken for a corrupt one. */
	private refuseIoError(result: JsonReadResult): void
	{
		if (result.kind !== "io-error") return;

		const detail = result.code ? `${result.code}: ${result.reason}` : result.reason;

		throw new AppErrorException("save-failed", "Your progress file could not be read right now.", "Close any program that may be using it (a backup or sync tool), then restart Unreal Dojo.", detail);
	}

	/** Validates a parsed save, or returns null when it does not match the schema. Throws for a save from a newer app. */
	private parse(value: unknown): PlayerProgress | null
	{
		const version = typeof value === "object" && value !== null && "version" in value ? (value as { version: unknown }).version : undefined;

		if (typeof version === "number" && version > SAVE_VERSION)
		{
			throw new AppErrorException("save-failed", "This progress file was made by a newer version of Unreal Dojo.", "Update the app to keep your progress.", `save version ${version}, app reads ${SAVE_VERSION}`);
		}

		const result = playerProgressSchema.safeParse(value);

		return result.success ? result.data : null;
	}
}
