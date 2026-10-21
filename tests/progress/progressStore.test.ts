// The save file: round trip, crash mid-write, crash before rename, corrupt-file recovery, newer versions, and the real disk.
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { AppErrorException } from "../../src/main/errors/AppErrorException";
import { createNewProgress } from "../../src/main/services/progress/createNewProgress";
import { NodeFileSystem } from "../../src/main/services/progress/NodeFileSystem";
import { ProgressStore } from "../../src/main/services/progress/ProgressStore";
import { MemoryFileSystem } from "../support/MemoryFileSystem";
import { localMoment } from "../support/progressFixtures";

const now = localMoment(2026, 10, 21);
const savePath = "/user-data/progress.json";

/** A store on an in-memory disk. */
function memoryStore(): { store: ProgressStore; fileSystem: MemoryFileSystem }
{
	const fileSystem = new MemoryFileSystem();

	return { store: new ProgressStore(fileSystem, "/user-data"), fileSystem };
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

describe("ProgressStore on the real disk", () =>
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
