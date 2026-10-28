// A lock between verifier runs on one workspace: taken with an atomic `mkdir`, with an owner file so a dead run's lock can be broken (W14, A1282).
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { hostname } from "node:os";
import { dirname, join } from "node:path";

/** Who holds a lock, written inside the lock folder. */
interface LockOwner
{
	token: string;
	processId: number;
	hostName: string;
	startedAt: string;
	workingFolder: string;
}

/** How the lock waits and when it gives up on a holder. Tests shrink the times. */
export interface WorkspaceLockTuning
{
	/** How often a waiting run looks at the lock again. */
	pollMilliseconds: number;

	/** How often a waiting run says it is still waiting. */
	reminderMilliseconds: number;

	/** A lock held longer than this is broken even when its process still exists (a recycled process id): longer than any run. */
	staleAfterMilliseconds: number;

	/** How long a lock folder may exist without an owner file before it counts as abandoned (the holder is between `mkdir` and writing it). */
	ownerGraceMilliseconds: number;

	/** Whether a process exists on this machine. */
	isProcessAlive: (processId: number) => boolean;
}

/** Where the lock lives and who is listening. */
export interface WorkspaceLockOptions extends Partial<WorkspaceLockTuning>
{
	/** The folder whose existence is the lock. */
	folder: string;
	log: (line: string) => void;

	/** Aborting ends the wait with an error. */
	signal?: AbortSignal;
}

/** A taken lock; `release` is safe to call twice. */
export interface HeldWorkspaceLock
{
	release(): Promise<void>;
}

/** Twelve hours: a full pack's starter checks take about two, so a lock older than this belongs to a run that is gone. */
const DEFAULT_STALE_AFTER_MILLISECONDS = 12 * 60 * 60 * 1000;

/** The retry settings for removing a folder an editor or a virus scanner may still hold on Windows. */
const REMOVE_OPTIONS = { recursive: true, force: true, maxRetries: 5, retryDelay: 200 } as const;

/** Whether a process with this id exists; a process we may not signal still exists. */
function processExists(processId: number): boolean
{
	try
	{
		process.kill(processId, 0);

		return true;
	}
	catch (error)
	{
		return (error as NodeJS.ErrnoException).code === "EPERM";
	}
}

/** Waits `milliseconds`, or less when `signal` aborts. */
async function pause(milliseconds: number, signal: AbortSignal | undefined): Promise<void>
{
	await new Promise<void>((resolve) =>
	{
		const timer = setTimeout(done, milliseconds);

		/** Ends the wait and stops listening for the abort. */
		function done(): void
		{
			clearTimeout(timer);
			signal?.removeEventListener("abort", done);
			resolve();
		}

		signal?.addEventListener("abort", done, { once: true });
	});
}

/**
 * Keeps two verifier runs, possibly from different worktrees, out of one workspace at the same time. This is separate from
 * the agents' engine lock convention, which keeps runs from sharing the machine's engine.
 * A waiting run logs who holds the lock. It breaks the lock when the holder's process is gone (same machine), when the lock has
 * no owner file after a short grace, or when it is older than `staleAfterMilliseconds`; otherwise it waits for as long as it takes,
 * because a build can legitimately run for an hour. Two runs breaking the same dead lock at once is possible in theory; the
 * rename that breaks it fails for the loser, which then simply tries again.
 */
export class WorkspaceLock
{
	private readonly options: WorkspaceLockOptions;
	private readonly tuning: WorkspaceLockTuning;

	/** Keeps the options, filling in the default times. */
	constructor(options: WorkspaceLockOptions)
	{
		this.options = options;
		this.tuning = {
			pollMilliseconds: options.pollMilliseconds ?? 3_000,
			reminderMilliseconds: options.reminderMilliseconds ?? 30_000,
			staleAfterMilliseconds: options.staleAfterMilliseconds ?? DEFAULT_STALE_AFTER_MILLISECONDS,
			ownerGraceMilliseconds: options.ownerGraceMilliseconds ?? 60_000,
			isProcessAlive: options.isProcessAlive ?? processExists,
		};
	}

	/** Takes the lock, waiting while another run holds it. Throws when `signal` aborts first. */
	async acquire(): Promise<HeldWorkspaceLock>
	{
		const { folder, log, signal } = this.options;
		let waitedSince: number | undefined;
		let lastReminder = 0;

		await mkdir(dirname(folder), { recursive: true });

		for (;;)
		{
			if (signal?.aborted === true) throw new Error("cancelled while waiting for the verify workspace lock");

			const owner: LockOwner = { token: randomUUID(), processId: process.pid, hostName: hostname(), startedAt: new Date().toISOString(), workingFolder: process.cwd() };

			try
			{
				await mkdir(folder);
				await writeFile(join(folder, "owner.json"), `${JSON.stringify(owner, null, "\t")}\n`, "utf8");

				return { release: () => this.release(owner.token) };
			}
			catch (error)
			{
				if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
			}

			const stale = await this.staleReason();

			if (stale !== undefined)
			{
				log(`engine: breaking the verify workspace lock (${stale.reason})`);
				await this.breakLock(stale.owner);

				continue;
			}

			waitedSince ??= Date.now();

			if (Date.now() - lastReminder >= this.tuning.reminderMilliseconds)
			{
				lastReminder = Date.now();
				log(`engine: waiting for the verify workspace, in use by ${await this.describeHolder()} (waited ${Math.round((Date.now() - waitedSince) / 1000)} s)`);
			}

			await pause(this.tuning.pollMilliseconds, signal);
		}
	}

	/** The owner recorded in the lock folder, or undefined when the file is missing or unreadable. */
	private async readOwner(): Promise<LockOwner | undefined>
	{
		try
		{
			return JSON.parse(await readFile(join(this.options.folder, "owner.json"), "utf8")) as LockOwner;
		}
		catch
		{
			return undefined;
		}
	}

	/** Why the current lock may be broken, with the owner it was judged on; undefined when its holder is still working. */
	private async staleReason(): Promise<{ reason: string; owner: LockOwner | undefined } | undefined>
	{
		const owner = await this.readOwner();

		if (owner === undefined)
		{
			const info = await stat(this.options.folder).catch(() => undefined);

			// A lock folder that vanished between `mkdir` and now is free; the next attempt takes it.
			if (info === undefined) return { reason: "it was released a moment ago", owner };

			return Date.now() - info.mtimeMs > this.tuning.ownerGraceMilliseconds ? { reason: "its owner file is missing", owner } : undefined;
		}

		const age = Date.now() - Date.parse(owner.startedAt);

		if (age > this.tuning.staleAfterMilliseconds) return { reason: `held for ${Math.round(age / 3_600_000)} hours by process ${owner.processId}, longer than any run`, owner };

		if (owner.hostName === hostname() && !this.tuning.isProcessAlive(owner.processId)) return { reason: `process ${owner.processId} that held it is no longer running`, owner };

		return undefined;
	}

	/** Removes a lock judged stale, unless somebody else took it over since it was judged. */
	private async breakLock(judged: LockOwner | undefined): Promise<void>
	{
		const current = await this.readOwner();

		if (current?.token !== judged?.token) return;

		const aside = `${this.options.folder}.broken-${process.pid}-${Date.now()}`;

		// Rename is atomic, so only one run breaks a given lock; the loser's rename fails and it loops.
		if (await rename(this.options.folder, aside).then(() => true, () => false)) await rm(aside, REMOVE_OPTIONS);
	}

	/** A few words on who holds the lock now, for the waiting message. */
	private async describeHolder(): Promise<string>
	{
		const owner = await this.readOwner();

		return owner === undefined ? "another run" : `process ${owner.processId} (since ${owner.startedAt}, working in ${owner.workingFolder})`;
	}

	/** Removes the lock folder, but only when this run still owns it. */
	private async release(token: string): Promise<void>
	{
		if ((await this.readOwner())?.token === token) await rm(this.options.folder, REMOVE_OPTIONS);
	}
}
