// A lock between verifier runs on one workspace: a folder that appears already holding its owner file, so a dead run's lock can be told from a live one (W14, A1282).
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { hostname, uptime } from "node:os";
import { basename, dirname, join } from "node:path";

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

	/** How long a lock folder may exist without an owner file before it counts as abandoned (only a lock made by something else can lack one). */
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

/** Errors that mean the lock folder exists, so another run holds it. */
const HELD_ERROR_CODES = new Set(["EEXIST", "ENOTEMPTY"]);

/** Errors Windows gives for a folder that is being deleted or is held open; waiting a moment is right, but not forever. */
const TRANSIENT_ERROR_CODES = new Set(["EPERM", "EACCES", "EBUSY"]);

/** Polls in a row that may fail with a transient error before it is reported as a real problem. */
const MAXIMUM_TRANSIENT_POLLS = 20;

/** Tries, and the pause between them, to move the lock folder aside when releasing it. */
const RELEASE_ATTEMPTS = 40;
const RELEASE_RETRY_MILLISECONDS = 50;

/** Breaks of a stale lock in a row that may fail (something holds it open) before the run gives up and names the folder. */
const MAXIMUM_FAILED_BREAKS = 20;

/** A half-made or half-removed lock folder older than this is garbage from a killed run. */
const LEFTOVER_MILLISECONDS = 10 * 60 * 1000;

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
 * A lock is made as `<lock>.pending-<token>` with its owner file inside and then renamed to `<lock>`, which fails while the lock
 * exists (it is never empty), so a lock folder is never visible without an owner.
 * A waiting run logs who holds the lock. It breaks the lock when the holder's process is gone (same machine), when the machine
 * restarted since the lock was made, when the lock has no owner file after a short grace, or when it is older than
 * `staleAfterMilliseconds`; otherwise it waits for as long as it takes, because a build can legitimately run for an hour.
 * Breaking renames the lock aside and checks the owner it took; if that is not the one judged dead (someone broke and retook the lock
 * in between), it puts the folder back and carries on waiting.
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
		let transientPolls = 0;
		let failedBreaks = 0;

		await mkdir(dirname(folder), { recursive: true });
		await this.removeLeftovers();

		for (;;)
		{
			if (signal?.aborted === true) throw new Error("cancelled while waiting for the verify workspace lock");

			const owner: LockOwner = { token: randomUUID(), processId: process.pid, hostName: hostname(), startedAt: new Date().toISOString(), workingFolder: process.cwd() };
			const pending = `${folder}.pending-${owner.token}`;

			await mkdir(pending);
			await writeFile(join(pending, "owner.json"), `${JSON.stringify(owner, null, "\t")}\n`, "utf8");

			try
			{
				await rename(pending, folder);

				return { release: () => this.release(owner.token) };
			}
			catch (error)
			{
				await rm(pending, REMOVE_OPTIONS);

				const code = (error as NodeJS.ErrnoException).code ?? "";

				// Windows says EPERM, not EEXIST, when the target folder exists; that is an ordinary wait. With no lock folder to explain it, it may be a real problem.
				if (TRANSIENT_ERROR_CODES.has(code))
				{
					const held = await stat(folder).then(() => true, () => false);

					transientPolls = held ? 0 : transientPolls + 1;

					if (transientPolls > MAXIMUM_TRANSIENT_POLLS) throw error;
				}
				else if (HELD_ERROR_CODES.has(code))
				{
					transientPolls = 0;
				}
				else
				{
					throw error;
				}
			}

			const stale = await this.staleReason();

			if (stale === "vanished")
			{
				await pause(Math.min(this.tuning.pollMilliseconds, 200), signal);

				continue;
			}

			if (stale !== undefined)
			{
				log(`engine: breaking the verify workspace lock ${folder} (${stale.reason})`);

				if (await this.breakLock(stale.owner))
				{
					failedBreaks = 0;

					continue;
				}

				// Another run may have broken it first, or something holds a file in it open; look again after a pause instead of spinning.
				if (++failedBreaks > MAXIMUM_FAILED_BREAKS) throw new Error(`the verify workspace lock ${folder} is stale (${stale.reason}) but cannot be removed; close whatever has it open, or delete the folder by hand`);

				await pause(this.tuning.pollMilliseconds, signal);

				continue;
			}

			waitedSince ??= Date.now();

			if (Date.now() - lastReminder >= this.tuning.reminderMilliseconds)
			{
				lastReminder = Date.now();
				log(`engine: waiting for the verify workspace lock ${folder}, held by ${await this.describeHolder()} (waited ${Math.round((Date.now() - waitedSince) / 1000)} s)`);
			}

			await pause(this.tuning.pollMilliseconds, signal);
		}
	}

	/** The owner recorded in a lock folder (this lock's by default), or undefined when the file is missing or unreadable. */
	private async readOwner(folder: string = this.options.folder): Promise<LockOwner | undefined>
	{
		try
		{
			return JSON.parse(await readFile(join(folder, "owner.json"), "utf8")) as LockOwner;
		}
		catch
		{
			return undefined;
		}
	}

	/** Why the current lock may be broken, with the owner it was judged on; "vanished" when it is gone already; undefined when its holder is still working. */
	private async staleReason(): Promise<{ reason: string; owner: LockOwner | undefined } | "vanished" | undefined>
	{
		const owner = await this.readOwner();

		if (owner === undefined)
		{
			const lockStatus = await stat(this.options.folder).catch(() => undefined);

			if (lockStatus === undefined) return "vanished";

			return Date.now() - lockStatus.mtimeMs > this.tuning.ownerGraceMilliseconds ? { reason: "its owner file is missing", owner } : undefined;
		}

		const startedAt = Date.parse(owner.startedAt);
		const age = Date.now() - startedAt;

		if (age > this.tuning.staleAfterMilliseconds) return { reason: `held for ${Math.round(age / 3_600_000)} hours by process ${owner.processId}, longer than any run`, owner };

		// Process ids are reused after a restart, so a lock made before the machine started cannot belong to a live run.
		if (owner.hostName === hostname() && startedAt < Date.now() - uptime() * 1000 - 60_000) return { reason: `made before the last restart of this machine by process ${owner.processId}`, owner };

		if (owner.hostName === hostname() && !this.tuning.isProcessAlive(owner.processId)) return { reason: `process ${owner.processId} that held it is no longer running`, owner };

		return undefined;
	}

	/**
	 * Removes a lock judged stale, unless somebody else took it over since it was judged (then it is put back). Returns whether the
	 * stale lock was taken away.
	 */
	private async breakLock(judged: LockOwner | undefined): Promise<boolean>
	{
		const aside = `${this.options.folder}.broken-${process.pid}-${Date.now()}`;

		// Rename is atomic, so only one run takes a given lock folder away; the loser's rename fails.
		if (!(await rename(this.options.folder, aside).then(() => true, () => false))) return false;

		const taken = await this.readOwner(aside);

		if (taken?.token === judged?.token)
		{
			await rm(aside, REMOVE_OPTIONS);

			return true;
		}

		// A different, live lock was taken in the meantime: restore it. If that fails, a third run has already made a lock at the path
		// (three runs racing within milliseconds); the lock set aside is then dropped, which is the known gap in A1282.
		this.options.log(`engine: the verify workspace lock ${this.options.folder} changed hands while it was being broken; leaving it alone`);

		if (!(await rename(aside, this.options.folder).then(() => true, () => false))) await rm(aside, REMOVE_OPTIONS);

		return false;
	}

	/** Removes pending, broken-aside and released-aside folders that a killed run left beside the lock. */
	private async removeLeftovers(): Promise<void>
	{
		const prefix = `${basename(this.options.folder)}.`;

		for (const entry of await readdir(dirname(this.options.folder)).catch(() => []))
		{
			if (!entry.startsWith(prefix) || !/^(?:pending|broken|released)-/.test(entry.slice(prefix.length))) continue;

			const status = await stat(join(dirname(this.options.folder), entry)).catch(() => undefined);

			if (status !== undefined && Date.now() - status.mtimeMs > LEFTOVER_MILLISECONDS) await rm(join(dirname(this.options.folder), entry), REMOVE_OPTIONS);
		}
	}

	/** A few words on who holds the lock now, for the waiting message. */
	private async describeHolder(): Promise<string>
	{
		const owner = await this.readOwner();

		return owner === undefined ? "another run" : `process ${owner.processId} (since ${owner.startedAt}, working in ${owner.workingFolder})`;
	}

	/**
	 * Removes the lock folder, but only when this run still owns it. The folder is renamed away first, so a waiting run never sees a
	 * half-emptied lock folder it could rename a new lock over.
	 */
	private async release(token: string): Promise<void>
	{
		if ((await this.readOwner())?.token !== token) return;

		const aside = `${this.options.folder}.released-${token}`;

		// On Windows a waiting run reading `owner.json` can make the rename fail for a moment, so it is retried while this run still owns the lock.
		for (let attempt = 0; attempt < RELEASE_ATTEMPTS; attempt++)
		{
			if (await rename(this.options.folder, aside).then(() => true, () => false))
			{
				await rm(aside, REMOVE_OPTIONS);

				return;
			}

			// A lock already taken away from under this run (a break) leaves nothing to remove.
			if ((await this.readOwner())?.token !== token) return;

			await pause(RELEASE_RETRY_MILLISECONDS, undefined);
		}

		await rm(this.options.folder, REMOVE_OPTIONS);
	}
}
