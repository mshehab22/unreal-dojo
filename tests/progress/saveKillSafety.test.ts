// The save survives a real kill: a child process writes big saves through the real code and is killed at random moments, then the folder must load.
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { AtomicJsonFile } from "../../src/main/services/progress/AtomicJsonFile";
import { createNewProgress, createNewQuestProgress } from "../../src/main/services/progress/createNewProgress";
import { migrateSave } from "../../src/main/services/progress/migrateSave";
import { NodeFileSystem } from "../../src/main/services/progress/NodeFileSystem";
import { playerProgressSchema } from "../../src/main/services/progress/progressSchema";
import { ProgressStore, SAVE_FILE_NAME } from "../../src/main/services/progress/ProgressStore";
import { REAL_DISK_TIMEOUT_MS } from "../support/realDiskBudget";
import { localMoment } from "../support/progressFixtures";

/** How many times the child is killed. */
const KILL_COUNT = 20;

/** The longest the child runs after it says it is ready, in milliseconds. Short enough to keep the disk traffic small, long enough to land inside several writes. */
const LONGEST_RUN_BEFORE_KILL_MS = 600;

/** The child script, run with the same node that runs the tests. */
const CHILD_SCRIPT = resolve("tests", "progress", "support", "killedSaveWriter.ts");

/** What the parent learned from one killed child. */
interface KilledRun
{
	/** Every sequence number the child printed, in order. Each was printed after its write call returned. */
	acknowledged: number[];

	/** Whatever the child wrote to stderr. */
	errorText: string;
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

/** Runs the child, kills it with SIGKILL (TerminateProcess on Windows) `killAfterMs` after it says ready, and answers once it has exited. */
function runUntilKilled(folder: string, templatePath: string, killAfterMs: number): Promise<KilledRun>
{
	return new Promise((resolvePromise, rejectPromise) =>
	{
		const child = spawn(process.execPath, ["--import", "tsx", CHILD_SCRIPT, folder, templatePath], { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
		const acknowledged: number[] = [];
		let errorText = "";
		let unfinishedLine = "";
		let killed = false;
		let killTimer: ReturnType<typeof setTimeout> | undefined;

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
					killTimer = setTimeout(() =>
					{
						killed = true;
						child.kill("SIGKILL");
					}, killAfterMs);
				}
				else
				{
					acknowledged.push(Number(line));
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
			clearTimeout(killTimer);

			if (killed) resolvePromise({ acknowledged, errorText });
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

	afterEach(async () =>
	{
		if (root) await removeFolder(root);
	});

	console.info(`saveKillSafety: seed ${baseSeed} (set DOJO_KILL_SEED=${baseSeed} to replay the same kill moments)`);

	for (let index = 0; index < KILL_COUNT; index++)
	{
		it(`kill ${index + 1} of ${KILL_COUNT}`, async () =>
		{
			const random = seededRandom(baseSeed + index);
			const killAfterMs = Math.floor(random() * LONGEST_RUN_BEFORE_KILL_MS);
			const seededSaves = index % 3;
			const label = `seed ${baseSeed}, kill ${index + 1}, killed ${killAfterMs} ms after ready, ${seededSaves} saves before the child`;

			root = await mkdtemp(join(tmpdir(), "dojo-kill-"));
			const folder = join(root, "save");
			const templatePath = join(root, "template.json");
			await mkdir(folder);
			await writeFile(templatePath, JSON.stringify(templateSave()), "utf8");

			// A save made before the child starts (xp 0), so the kill test also meets an old save and its backup.
			const seedFile = new AtomicJsonFile(new NodeFileSystem(), folder, join(folder, SAVE_FILE_NAME));
			for (let seedIndex = 0; seedIndex < seededSaves; seedIndex++) await seedFile.write(templateSave());

			const run = await runUntilKilled(folder, templatePath, killAfterMs);
			expect(run.errorText, label).toBe("");

			const lastAcknowledged = run.acknowledged.at(-1) ?? 0;
			console.info(`saveKillSafety: ${label}: ${lastAcknowledged} saves acknowledged`);
			expect(run.acknowledged, label).toEqual(Array.from({ length: lastAcknowledged }, (_unused, position) => position + 1));

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
			const leftovers = (await readdir(folder)).filter((name) => name.endsWith(".tmp"));
			expect(leftovers, label).toEqual([]);
			expect((await store.load(localMoment(2026, 10, 27))).progress.xp, label).toBe(loaded.progress.xp + 1);
		});
	}
});
