// The save survives a real kill: a child process writes big saves through the real code and is killed at random moments, then the folder must load.
import { type ChildProcess, spawn } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, afterEach, describe, expect, it } from "vitest";

import { AtomicJsonFile } from "../../src/main/services/progress/AtomicJsonFile";
import { createNewProgress, createNewQuestProgress } from "../../src/main/services/progress/createNewProgress";
import { migrateSave } from "../../src/main/services/progress/migrateSave";
import { NodeFileSystem } from "../../src/main/services/progress/NodeFileSystem";
import { playerProgressSchema } from "../../src/main/services/progress/progressSchema";
import { ProgressStore, SAVE_FILE_NAME } from "../../src/main/services/progress/ProgressStore";
import { localMoment } from "../support/progressFixtures";
import { REAL_DISK_TIMEOUT_MS } from "../support/realDiskBudget";

/** How many times the child is killed. */
const KILL_COUNT = 20;

/**
 * Every this-many kills (starting with the first), the kill is timed from "ready" instead of from the first acknowledged save, so it comes sooner.
 * The child usually acknowledges a save or more even in that short wait, so this does not reliably hit the very first write; the in-memory test
 * "leaves no main file ... when the very first save crashes" in progressStore.test.ts covers that case. The others wait for progress.
 */
const EARLY_KILL_EVERY = 10;

/** The longest wait after the first acknowledged save before the kill, in milliseconds. Short enough to keep the disk traffic small, long enough to land inside several writes. */
const LONGEST_WAIT_AFTER_FIRST_SAVE_MS = 600;

/** The longest wait after "ready" for an early kill, in milliseconds. */
const LONGEST_EARLY_WAIT_MS = 100;

/** How long the child gets from its start to reach the point the kill waits for ("ready" for an early kill, else the first acknowledged save), before the run is failed with a clear message, in milliseconds. Well under the 30 s test budget. */
const CHILD_DEADLINE_MS = 15_000;


/** The repository root, where `tsx` is installed. */
const REPOSITORY_ROOT = fileURLToPath(new URL("../..", import.meta.url));

/** The child script, run with the same node that runs the tests. */
const CHILD_SCRIPT = fileURLToPath(new URL("./support/killedSaveWriter.ts", import.meta.url));

/** When the kill happens. */
type KillMoment = { kind: "after-ready"; delayMs: number } | { kind: "after-first-save"; delayMs: number };

/** What the parent learned from one killed child. */
interface KilledRun
{
	/** Every sequence number the child printed, in order. Each was printed after its write call returned. */
	acknowledged: number[];

	/** Whatever the child wrote to stderr. */
	errorText: string;
}

/** What one run showed, gathered to check that the 20 runs together really tested a kill mid-write. */
interface RunSummary
{
	/** How many saves the child acknowledged before it was killed. */
	acknowledgedCount: number;

	/** True when the folder held a `.tmp` or `.bak.tmp` right after the kill, which only a kill during a write leaves behind. */
	foundLeftoverTemporaryFile: boolean;
}

/** The seed for this run: set DOJO_KILL_SEED to replay the same kill moments, otherwise the clock picks one. It is logged below. */
const baseSeed = Number(process.env["DOJO_KILL_SEED"] ?? Date.now() % 1_000_000_000);

/** A small seeded random number generator (mulberry32), so the kill moments can be replayed from the logged seed. */
function seededRandom(seed: number): () => number
{
	let state = seed >>> 0;

	return () =>
	{
		state = (state + 0x6d2b79f5) >>> 0;
		let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
		mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;

		return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
	};
}

/** The template save the child pads and numbers: a new save with one quest whose saved file the child fills. */
function templateSave()
{
	const save = createNewProgress(localMoment(2026, 10, 27));
	save.quests["pad"] = { ...createNewQuestProgress(), savedFiles: { "pad.cpp": "" } };

	return save;
}

/** Removes a folder, retrying because Windows may keep files locked for a moment after a process was terminated. */
async function removeFolder(folder: string): Promise<void>
{
	await rm(folder, { recursive: true, force: true, maxRetries: 20, retryDelay: 200 });
}

/** Kills a child that is still running and waits until it has exited, so nothing keeps writing into a folder about to be removed. */
async function killAndWait(child: ChildProcess): Promise<void>
{
	if (child.exitCode !== null || child.signalCode !== null) return;

	const exited = new Promise<void>((resolveExit) => child.once("close", () => resolveExit()));
	child.kill("SIGKILL");
	await exited;
}

/**
 * Runs the child and kills it with SIGKILL (TerminateProcess on Windows) at `moment`, then answers once it has exited.
 * Fails with a clear message when the child does not say "ready", or does not acknowledge a first save when the kill waits for one, within the deadline.
 */
function runUntilKilled(folder: string, templatePath: string, moment: KillMoment, onSpawn: (child: ChildProcess) => void): Promise<KilledRun>
{
	return new Promise((resolvePromise, rejectPromise) =>
	{
		const child = spawn(process.execPath, ["--import", "tsx", CHILD_SCRIPT, folder, templatePath], { cwd: REPOSITORY_ROOT, stdio: ["ignore", "pipe", "pipe"] });
		onSpawn(child);

		const acknowledged: number[] = [];
		let errorText = "";
		let unfinishedLine = "";
		let killed = false;
		let failure: Error | undefined;
		let killTimer: ReturnType<typeof setTimeout> | undefined;

		/** Kills the child now. */
		const killNow = (): void =>
		{
			killed = true;
			child.kill("SIGKILL");
		};

		/** Fails the run with a message and kills the child. */
		const fail = (message: string): void =>
		{
			failure = new Error(`${message}${errorText ? `: ${errorText}` : ""}`);
			killNow();
		};

		/** One deadline from the start to the point the kill waits for: it is cleared when the kill is scheduled, so a slow start fails clearly before the test budget runs out. */
		const deadlineTimer = setTimeout(() => fail(`the child did not reach ${moment.kind === "after-ready" ? "ready" : "its first acknowledged save"} within ${CHILD_DEADLINE_MS} ms`), CHILD_DEADLINE_MS);

		/** Starts the kill timer for the chosen moment. */
		const scheduleKill = (delayMs: number): void =>
		{
			clearTimeout(deadlineTimer);
			killTimer = setTimeout(killNow, delayMs);
		};

		child.stdout.setEncoding("utf8");
		child.stderr.setEncoding("utf8");

		child.stdout.on("data", (chunk: string) =>
		{
			const lines = (unfinishedLine + chunk).split("\n");
			unfinishedLine = lines.pop() ?? "";

			for (const line of lines)
			{
				if (line === "ready")
				{
					if (moment.kind === "after-ready") scheduleKill(moment.delayMs);
				}
				else
				{
					acknowledged.push(Number(line));
					if (acknowledged.length === 1 && moment.kind === "after-first-save") scheduleKill(moment.delayMs);
				}
			}
		});

		child.stderr.on("data", (chunk: string) =>
		{
			errorText += chunk;
		});

		child.on("error", rejectPromise);

		// "close" comes after stdout has been read to its end, so every printed number is counted.
		child.on("close", () =>
		{
			clearTimeout(deadlineTimer);
			clearTimeout(killTimer);

			if (failure) rejectPromise(failure);
			else if (killed) resolvePromise({ acknowledged, errorText });
			else rejectPromise(new Error(`the child ended before it was killed: ${errorText}`));
		});
	});
}

/** Reads a file's text, or undefined when it does not exist. */
async function readIfPresent(path: string): Promise<string | undefined>
{
	try
	{
		return await readFile(path, "utf8");
	}
	catch (error)
	{
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;

		throw error;
	}
}

/** True when the text is JSON that passes the save schema. */
function isValidSave(text: string): boolean
{
	try
	{
		return playerProgressSchema.safeParse(migrateSave(JSON.parse(text))).success;
	}
	catch
	{
		return false;
	}
}

// Real child processes writing big files: these tests get the real-disk budget each.
describe("the save survives a kill mid-write", { timeout: REAL_DISK_TIMEOUT_MS }, () =>
{
	let root = "";
	let runningChild: ChildProcess | undefined;
	const summaries: RunSummary[] = [];

	// Whatever happened in the test, the child is dead before its folder is removed.
	afterEach(async () =>
	{
		if (runningChild) await killAndWait(runningChild);
		runningChild = undefined;

		if (root) await removeFolder(root);
		root = "";
	});

	// Guards against a test that passes while testing nothing. It only runs when all 20 kills ran (not when the tests are filtered).
	afterAll(() =>
	{
		if (summaries.length < KILL_COUNT) return;

		const runsWithABackupToMake = summaries.filter((summary) => summary.acknowledgedCount >= 2).length;
		const runsWithLeftovers = summaries.filter((summary) => summary.foundLeftoverTemporaryFile).length;
		console.info(`saveKillSafety: seed ${baseSeed}: ${runsWithABackupToMake} of ${KILL_COUNT} runs acknowledged 2 or more saves, ${runsWithLeftovers} left a temp file, acknowledged per run: ${summaries.map((summary) => summary.acknowledgedCount).join(" ")}`);

		// Two or more acknowledged saves means the child wrote a save over an earlier one, so the kill window held real backup copies and renames, not only first writes.
		expect(runsWithABackupToMake, `seed ${baseSeed}: no run got past one save, so no kill could land while a backup was being made`).toBeGreaterThanOrEqual(1);

		// A .tmp or .bak.tmp can only be left by a kill that landed during a write, so this proves a kill really landed mid-write.
		expect(runsWithLeftovers, `seed ${baseSeed}: no kill left a temp file, so none landed mid-write`).toBeGreaterThanOrEqual(1);
	});

	console.info(`saveKillSafety: seed ${baseSeed} (set DOJO_KILL_SEED=${baseSeed} to replay the same kill moments)`);

	for (let index = 0; index < KILL_COUNT; index++)
	{
		it(`kill ${index + 1} of ${KILL_COUNT}`, async () =>
		{
			const random = seededRandom(baseSeed + index);
			const early = index % EARLY_KILL_EVERY === 0;
			const moment: KillMoment = early
				? { kind: "after-ready", delayMs: Math.floor(random() * LONGEST_EARLY_WAIT_MS) }
				: { kind: "after-first-save", delayMs: Math.floor(random() * LONGEST_WAIT_AFTER_FIRST_SAVE_MS) };
			const seededSaves = index % 3;
			const label = `seed ${baseSeed}, kill ${index + 1}, killed ${moment.delayMs} ms ${moment.kind === "after-ready" ? "after ready" : "after the first save"}, ${seededSaves} saves before the child`;

			root = await mkdtemp(join(tmpdir(), "dojo-kill-"));
			const folder = join(root, "save");
			const templatePath = join(root, "template.json");
			await mkdir(folder);
			await writeFile(templatePath, JSON.stringify(templateSave()), "utf8");

			// A save made before the child starts (xp 0), so the kill test also meets an old save and its backup.
			const seedFile = new AtomicJsonFile(new NodeFileSystem(), folder, join(folder, SAVE_FILE_NAME));
			for (let seedIndex = 0; seedIndex < seededSaves; seedIndex++) await seedFile.write(templateSave());

			const run = await runUntilKilled(folder, templatePath, moment, (child) =>
			{
				runningChild = child;
			});
			expect(run.errorText, label).toBe("");

			const lastAcknowledged = run.acknowledged.at(-1) ?? 0;
			console.info(`saveKillSafety: ${label}: ${lastAcknowledged} saves acknowledged`);
			expect(run.acknowledged, label).toEqual(Array.from({ length: lastAcknowledged }, (_unused, position) => position + 1));

			const leftovers = (await readdir(folder)).filter((name) => name.endsWith(".tmp"));
			summaries.push({ acknowledgedCount: lastAcknowledged, foundLeftoverTemporaryFile: leftovers.length > 0 });

			// The main file is whole: it parses and passes the schema (it is absent only if the very first save never landed).
			const mainText = await readIfPresent(join(folder, SAVE_FILE_NAME));
			if (lastAcknowledged > 0 || seededSaves > 0) expect(mainText, label).toBeDefined();
			if (mainText !== undefined) expect(isValidSave(mainText), `${label}: the main file is torn`).toBe(true);

			// The backup is never torn.
			const backupText = await readIfPresent(join(folder, `${SAVE_FILE_NAME}.bak`));
			if (backupText !== undefined) expect(isValidSave(backupText), `${label}: the backup is torn`).toBe(true);

			// Loading never falls back to a fresh save once a save existed, and finds the last acknowledged save or the one being written.
			const store = new ProgressStore(new NodeFileSystem(), folder);
			const loaded = await store.load(localMoment(2026, 10, 27));
			expect(loaded.recovery, label).not.toBe("fresh");
			expect(loaded.quarantinedPath, label).toBeUndefined();
			expect([lastAcknowledged, lastAcknowledged + 1], label).toContain(loaded.progress.xp);

			// The next save overwrites any leftover temp files, so none remain.
			await store.save({ ...loaded.progress, xp: loaded.progress.xp + 1 });
			const leftoversAfterSave = (await readdir(folder)).filter((name) => name.endsWith(".tmp"));
			expect(leftoversAfterSave, label).toEqual([]);
			expect((await store.load(localMoment(2026, 10, 27))).progress.xp, label).toBe(loaded.progress.xp + 1);
		});
	}
});
