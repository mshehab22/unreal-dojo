// The save file: round trip, crash mid-write, crash before rename, corrupt-file recovery, newer versions, and the real disk.
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { AppErrorException } from "../../src/main/errors/AppErrorException";
import { createNewProgress } from "../../src/main/services/progress/createNewProgress";
import { NodeFileSystem } from "../../src/main/services/progress/NodeFileSystem";
import { ProgressStore } from "../../src/main/services/progress/ProgressStore";
import { MEMORY_SAVE_PATH, MEMORY_USER_DATA_FOLDER, MemoryFileSystem } from "../support/MemoryFileSystem";
import { localMoment } from "../support/progressFixtures";
import { REAL_DISK_TIMEOUT_MS } from "../support/realDiskBudget";

const now = localMoment(2026, 10, 21);
const savePath = MEMORY_SAVE_PATH;

/** A store on an in-memory disk. */
function memoryStore(): { store: ProgressStore; fileSystem: MemoryFileSystem }
{
	const fileSystem = new MemoryFileSystem();

	return { store: new ProgressStore(fileSystem, MEMORY_USER_DATA_FOLDER), fileSystem };
}

/** A save with a recognizable name and XP. */
function namedSave(playerName: string, xp: number)
{
	return { ...createNewProgress(now), playerName, xp };
}

describe("ProgressStore", () =>
{
	it("starts a fresh save when there is no file", async () =>
	{
		const loaded = await memoryStore().store.load(now);

		expect(loaded.recovery).toBe("none");
		expect(loaded.progress).toEqual(createNewProgress(now));
	});

	it("round-trips a save", async () =>
	{
		const { store } = memoryStore();
		const progress = namedSave("Mohammad", 340);
		progress.memory["term.uobject"] = { ease: 2.36, intervalDays: 3, repetitions: 2, mastery: "familiar", lastReviewedAt: now.toISOString() };

		await store.save(progress);

		expect((await store.load(now)).progress).toEqual(progress);
	});

	it("keeps the previous save when the app crashes halfway through writing the temp file", async () =>
	{
		const { store, fileSystem } = memoryStore();
		await store.save(namedSave("Before", 100));

		fileSystem.crashAt = "mid-temp-write";
		await expect(store.save(namedSave("After", 200))).rejects.toMatchObject({ appError: { code: "save-failed" } });

		expect(fileSystem.files.get(`${savePath}.tmp`)).toBeDefined();
		expect((await store.load(now)).progress.playerName).toBe("Before");
	});

	it("keeps the previous save when the app crashes after the temp file but before the rename", async () =>
	{
		const { store, fileSystem } = memoryStore();
		await store.save(namedSave("Before", 100));

		fileSystem.crashAt = "before-rename";
		await expect(store.save(namedSave("After", 200))).rejects.toBeInstanceOf(AppErrorException);

		const loaded = await store.load(now);
		expect(loaded.progress.playerName).toBe("Before");
		expect(loaded.recovery).toBe("none");
	});

	it("keeps a whole save and a whole backup when the app crashes halfway through copying the backup", async () =>
	{
		const { store, fileSystem } = memoryStore();
		await store.save(namedSave("First", 100));
		await store.save(namedSave("Second", 200));

		fileSystem.crashAt = "mid-backup-copy";
		await expect(store.save(namedSave("Third", 300))).rejects.toMatchObject({ appError: { code: "save-failed" } });

		// The torn copy sits in .bak.tmp; the real backup and the save are untouched and nothing is quarantined.
		expect(fileSystem.files.get(`${savePath}.bak.tmp`)).toBeDefined();
		expect(() => JSON.parse(fileSystem.files.get(`${savePath}.bak`) ?? "")).not.toThrow();
		expect(() => JSON.parse(fileSystem.files.get(savePath) ?? "")).not.toThrow();

		const loaded = await store.load(now);
		expect(loaded.recovery).toBe("none");
		expect(loaded.progress.playerName).toBe("Second");
		expect(JSON.parse(fileSystem.files.get(`${savePath}.bak`) ?? "").playerName).toBe("First");
	});

	it("overwrites a stale .tmp and .bak.tmp on the next save and ignores them on load", async () =>
	{
		const { store, fileSystem } = memoryStore();
		await store.save(namedSave("First", 100));
		await store.save(namedSave("Second", 200));
		fileSystem.crashAt = "mid-backup-copy";
		await expect(store.save(namedSave("Lost", 300))).rejects.toBeInstanceOf(AppErrorException);

		// A complete .tmp from a call that never answered is not promoted on load.
		fileSystem.files.set(`${savePath}.tmp`, JSON.stringify(namedSave("Complete but unanswered", 999)));
		expect((await store.load(now)).progress.playerName).toBe("Second");

		await store.save(namedSave("Third", 300));

		expect([...fileSystem.files.keys()].sort()).toEqual([savePath, `${savePath}.bak`]);
		expect((await store.load(now)).progress.playerName).toBe("Third");
		expect(JSON.parse(fileSystem.files.get(`${savePath}.bak`) ?? "").playerName).toBe("Second");
	});

	it("loads the new save when the app crashes right after the rename", async () =>
	{
		const { store, fileSystem } = memoryStore();
		await store.save(namedSave("Before", 100));

		fileSystem.crashAt = "after-rename";
		await expect(store.save(namedSave("After", 200))).rejects.toBeInstanceOf(AppErrorException);

		const loaded = await store.load(now);
		expect(loaded.recovery).toBe("none");
		expect(loaded.progress.playerName).toBe("After");
	});

	for (const crashPoint of ["mid-temp-write", "mid-backup-copy", "before-rename", "after-rename"] as const)
	{
		it(`always leaves a loadable save and no torn backup, whatever the crash point (${crashPoint})`, async () =>
		{
			const { store, fileSystem } = memoryStore();
			await store.save(namedSave("First", 100));
			await store.save(namedSave("Second", 200));

			fileSystem.crashAt = crashPoint;
			await expect(store.save(namedSave("Third", 300))).rejects.toBeInstanceOf(AppErrorException);

			expect(() => JSON.parse(fileSystem.files.get(savePath) ?? "")).not.toThrow();

			const backup = fileSystem.files.get(`${savePath}.bak`);
			if (backup !== undefined) expect(() => JSON.parse(backup)).not.toThrow();

			const loaded = await store.load(now);
			expect(loaded.recovery).toBe("none");
			expect(["Second", "Third"]).toContain(loaded.progress.playerName);
		});
	}

	it("writes the next save normally after a crash", async () =>
	{
		const { store, fileSystem } = memoryStore();
		fileSystem.crashAt = "mid-temp-write";
		await expect(store.save(namedSave("Lost", 1))).rejects.toBeInstanceOf(AppErrorException);

		await store.save(namedSave("Kept", 2));

		expect((await store.load(now)).progress.playerName).toBe("Kept");
	});

	it("recovers from a corrupt file with the backup and keeps the bad file aside", async () =>
	{
		const { store, fileSystem } = memoryStore();
		await store.save(namedSave("Older", 100));
		await store.save(namedSave("Newer", 200));
		fileSystem.files.set(savePath, "{ not json");

		const loaded = await store.load(now);

		expect(loaded.recovery).toBe("backup");
		expect(loaded.progress.playerName).toBe("Older");
		expect(loaded.quarantinedPath).toMatch(/progress\.json\.corrupt-/);
		expect(fileSystem.files.get(loaded.quarantinedPath ?? "")).toBe("{ not json");
	});

	it("recovers from a file that is valid JSON but not a save", async () =>
	{
		const { store, fileSystem } = memoryStore();
		await store.save(namedSave("Older", 100));
		await store.save(namedSave("Newer", 200));
		fileSystem.files.set(savePath, JSON.stringify({ ...namedSave("Broken", 1), xp: -5 }));

		expect((await store.load(now)).progress.playerName).toBe("Older");
	});

	it("starts fresh when both the file and the backup are corrupt", async () =>
	{
		const { store, fileSystem } = memoryStore();
		fileSystem.files.set(savePath, "garbage");
		fileSystem.files.set(`${savePath}.bak`, "also garbage");

		const loaded = await store.load(now);

		expect(loaded.recovery).toBe("fresh");
		expect(loaded.progress).toEqual(createNewProgress(now));
	});

	it("refuses a save from a newer app version instead of overwriting it", async () =>
	{
		const { store, fileSystem } = memoryStore();
		fileSystem.files.set(savePath, JSON.stringify({ ...namedSave("Future", 1), version: 99 }));

		await expect(store.load(now)).rejects.toMatchObject({ appError: { code: "save-failed" } });
	});

	for (const code of ["EBUSY", "EPERM", "EACCES"])
	{
		it(`refuses with save-failed and quarantines nothing when the disk answers ${code}`, async () =>
		{
			const { store, fileSystem } = memoryStore();
			await store.save(namedSave("Kept", 1));
			fileSystem.readErrorCode = code;

			await expect(store.load(now)).rejects.toMatchObject({ appError: { code: "save-failed" } });

			fileSystem.readErrorCode = null;
			expect([...fileSystem.files.keys()].sort()).toEqual([savePath]);
			expect((await store.load(now)).progress.playerName).toBe("Kept");
		});
	}

	it("fills lists added after the first save version when loading an older shape", async () =>
	{
		const { store, fileSystem } = memoryStore();
		const { memory: _memory, drillQueue: _queue, rematches: _rematches, testedOutWorldIds: _worlds, xpPotionUntil: _potion, ...older } = namedSave("Old", 10);
		fileSystem.files.set(savePath, JSON.stringify(older));

		const loaded = await store.load(now);

		expect(loaded.recovery).toBe("none");
		expect(loaded.progress.drillQueue).toEqual([]);
		expect(loaded.progress.xpPotionUntil).toBeNull();
	});
});

describe("ProgressStore on the real disk", { timeout: REAL_DISK_TIMEOUT_MS }, () =>
{
	let folder = "";

	afterEach(async () =>
	{
		if (folder) await rm(folder, { recursive: true, force: true });
	});

	it("writes through a temp file and leaves only the save and its backup", async () =>
	{
		folder = await mkdtemp(join(tmpdir(), "dojo-progress-"));
		const store = new ProgressStore(new NodeFileSystem(), folder);

		await store.save(namedSave("First", 1));
		await store.save(namedSave("Second", 2));

		expect((await readdir(folder)).sort()).toEqual(["progress.json", "progress.json.bak"]);
		expect(JSON.parse(await readFile(join(folder, "progress.json"), "utf8")).playerName).toBe("Second");
		expect((await store.load(now)).progress.playerName).toBe("Second");
	});

	it("serializes overlapping saves so the last one wins", async () =>
	{
		folder = await mkdtemp(join(tmpdir(), "dojo-progress-"));
		const store = new ProgressStore(new NodeFileSystem(), folder);

		await Promise.all([store.save(namedSave("One", 1)), store.save(namedSave("Two", 2)), store.save(namedSave("Three", 3))]);

		expect((await store.load(now)).progress.playerName).toBe("Three");
	});
});
