// Checks the content load budget: 300 quests cloned from the real content, on real disk, through the app's own catalog path, with a median under 300 ms.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { LoadedContent } from "@shared/types/content";

import { ContentCatalog } from "../src/main/content/ContentCatalog";
import { createContentCatalog } from "../src/main/content/createContentCatalog";
import { ProgressContentService } from "../src/main/services/progress/ProgressContentService";
import { fakeGraders } from "./support/contentFixture";
import { createLargeContentFixture, LARGE_QUEST_COUNT, LARGE_QUESTS_PER_WORLD, type LargeContentFixture } from "./support/largeContentFixture";
import { createTestProgressService } from "./support/progressFixtures";
import { SequenceRandom } from "./support/SequenceRandom";

/** The most the median content load may take, in milliseconds, for 300 quests. */
const LOAD_BUDGET_MILLISECONDS = 300;

/** How many fresh catalogs are loaded; the gate is the median, and the first (cold) time is printed too. */
const RUN_COUNT = 3;

/** The log line the catalog writes when a load finishes. */
const LOAD_LOG_PATTERN = /^\[content\] loaded (\d+) quests in (\d+) ms$/;

/** What one timed load returned. */
interface LoadMeasurement
{
	milliseconds: number;
	questCount: number;
	problemCount: number;
	aliasCount: number;
	availabilityCount: number;
}

/** Returns the middle value of a list of numbers. */
function median(values: number[]): number
{
	const sorted = [...values].sort((first, second) => first - second);

	return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/**
 * Times one content load the way the app does it: a fresh catalog on the folder, then the three first requests
 * (the World Map's `listPacks` and `getQuestAvailability`, and the alias table) against a fresh in-memory save.
 */
async function measureLoad(root: string): Promise<LoadMeasurement>
{
	const catalog = createContentCatalog(root);
	const progress = createTestProgressService();
	const content = new ProgressContentService(catalog, progress.service, fakeGraders(), new SequenceRandom([0]), () => "session");
	const startedAt = performance.now();

	catalog.startLoading();

	const packs = await catalog.listPacks();
	const aliases = await catalog.getGlossaryAliases();
	const availability = await content.getQuestAvailability();
	const milliseconds = performance.now() - startedAt;
	const status = await catalog.getStatus();

	expect(packs.length).toBeGreaterThan(0);

	return { milliseconds, questCount: status.questCount, problemCount: status.problems.length, aliasCount: aliases.length, availabilityCount: Object.keys(availability).length };
}

describe("content load budget", () =>
{
	let fixture!: LargeContentFixture;

	beforeAll(async () =>
	{
		fixture = await createLargeContentFixture();
	}, 60000);

	afterAll(async () =>
	{
		await fixture?.remove();
	});

	it("loads 300 cloned real quests with a median under the budget", async () =>
	{
		const logSpy = vi.spyOn(console, "info");
		const measurements: LoadMeasurement[] = [];
		let loadLines: string[];

		try
		{
			for (let run = 0; run < RUN_COUNT; run++) measurements.push(await measureLoad(fixture.root));

			loadLines = logSpy.mock.calls.map((call) => String(call[0])).filter((line) => LOAD_LOG_PATTERN.test(line));
		}
		finally
		{
			logSpy.mockRestore();
		}

		const times = measurements.map((measurement) => measurement.milliseconds);
		const middle = median(times);

		console.info(`[content load budget] ${LARGE_QUEST_COUNT} quests over ${fixture.worldCount} worlds: first (cold) ${times[0]?.toFixed(1)} ms, all ${times.map((time) => time.toFixed(1)).join(", ")} ms, median ${middle.toFixed(1)} ms, budget ${LOAD_BUDGET_MILLISECONDS} ms`);

		for (const measurement of measurements)
		{
			expect(measurement.questCount).toBe(LARGE_QUEST_COUNT);
			expect(measurement.problemCount).toBe(0);
			expect(measurement.aliasCount).toBeGreaterThan(0);
			expect(measurement.availabilityCount).toBe(LARGE_QUEST_COUNT);
		}

		expect(loadLines).toHaveLength(RUN_COUNT);
		expect(loadLines.every((line) => line.startsWith(`[content] loaded ${LARGE_QUEST_COUNT} quests in `))).toBe(true);
		expect(middle).toBeLessThan(LOAD_BUDGET_MILLISECONDS);
	}, 60000);

	it("writes the large fixture with the quest and world counts it promises", () =>
	{
		expect(fixture.questCount).toBe(LARGE_QUEST_COUNT);
		expect(fixture.worldCount).toBe(Math.ceil(LARGE_QUEST_COUNT / LARGE_QUESTS_PER_WORLD));
	});

	it("gives a cloned boss the same id prefix on its pieces as on its own id", async () =>
	{
		const files = await readdir(fixture.root, { recursive: true });
		const bossFile = files.find((file) => file.endsWith("boss-training-yard.md"));

		expect(bossFile).toBeDefined();

		const text = await readFile(join(fixture.root, bossFile ?? ""), "utf8");

		const bossPrefix = /^id: (load\d-)f1-/m.exec(text)?.[1];

		expect(bossPrefix).toBeDefined();
		expect(text).toMatch(new RegExp(`^\\s*- ${bossPrefix}f1-training-dummy\\s*$`, "m"));
	});
});

describe("content load log line", () =>
{
	it("reports the quest count and the elapsed time from the injected clock", async () =>
	{
		const loaded: LoadedContent = { packs: [], glossary: [], patterns: [], files: [], questSources: {}, problems: [] };
		const readings = [1000, 1042];
		const logSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
		const catalog = new ContentCatalog({ root: "/fixture", folderExists: async () => true, loadContent: async () => loaded, now: () => readings.shift() ?? 0 });

		try
		{
			await catalog.getStatus();

			expect(logSpy).toHaveBeenCalledWith("[content] loaded 0 quests in 42 ms");
		}
		finally
		{
			logSpy.mockRestore();
		}
	});
});
