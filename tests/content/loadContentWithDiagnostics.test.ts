// Checks the slow-load warning: silent for a quick load, one line with the read, parse and stall figures for a slow one, and a failed load still fails.
import { describe, expect, it } from "vitest";

import type { LoadedContent } from "@shared/types/content";

import { loadContentWithDiagnostics, SLOW_CONTENT_LOAD_MILLISECONDS, type TimedContentLoader } from "../../src/main/content/loadContentWithDiagnostics";
import type { ContentLoadOptions, ContentLoadTimings } from "../../src/main/services/content";

/** Content with nothing in it, which is all these tests need back from a load. */
const EMPTY_CONTENT: LoadedContent = { packs: [], glossary: [], patterns: [], files: [], questSources: {}, problems: [] };

/** The timings a fake load reports. */
const TIMINGS: ContentLoadTimings = { questFileCount: 150, totalReadMilliseconds: 12000, totalParseMilliseconds: 45 };

/** A loader that reports the given timings, runs `during` (to block or fail), and returns empty content. */
function fakeLoader(during: () => void = () => undefined): TimedContentLoader
{
	return {
		load: async (options?: ContentLoadOptions) =>
		{
			during();
			options?.onTimings?.(TIMINGS);

			return EMPTY_CONTENT;
		},
	};
}

/** A clock that returns the given readings one after another. */
function clockOf(...readings: number[]): () => number
{
	return () => readings.shift() ?? 0;
}

describe("loadContentWithDiagnostics", () =>
{
	it("returns the content and logs nothing when the load is quick", async () =>
	{
		const lines: string[] = [];

		const content = await loadContentWithDiagnostics(fakeLoader(), { now: clockOf(0, 50), log: (line) => lines.push(line) });

		expect(content).toBe(EMPTY_CONTENT);
		expect(lines).toEqual([]);
	});

	it("logs one warning with the file count, the read and parse totals, and the stall when the load is slow", async () =>
	{
		const lines: string[] = [];

		await loadContentWithDiagnostics(fakeLoader(), { now: clockOf(0, 16200), log: (line) => lines.push(line) });

		expect(lines).toHaveLength(1);
		expect(lines[0]).toContain("[content] slow load: 150 quest files took 16.2 s in all.");
		expect(lines[0]).toContain("Reading them added up to 12.0 s (80 ms per file)");
		expect(lines[0]).toContain("parsing took 0.0 s");
		expect(lines[0]).toMatch(/blocked for at most \d+ ms at a time/);
		expect(lines[0]).not.toContain("\u2014");
	});

	it("warns at exactly the threshold and not just below it", async () =>
	{
		const atThreshold: string[] = [];
		const belowThreshold: string[] = [];

		await loadContentWithDiagnostics(fakeLoader(), { now: clockOf(0, SLOW_CONTENT_LOAD_MILLISECONDS), log: (line) => atThreshold.push(line) });
		await loadContentWithDiagnostics(fakeLoader(), { now: clockOf(0, SLOW_CONTENT_LOAD_MILLISECONDS - 1), log: (line) => belowThreshold.push(line) });

		expect(atThreshold).toHaveLength(1);
		expect(belowThreshold).toHaveLength(0);
	});

	it("reports a stretch where the main process was blocked", async () =>
	{
		const lines: string[] = [];

		// A load whose first step blocks the thread for a while, as another piece of startup work would.
		const blocker = fakeLoader(() =>
		{
			const until = Date.now() + 250;
			while (Date.now() < until) { /* hold the main thread */ }
		});

		const delayed: TimedContentLoader = { load: async (options) => { await new Promise((resolve) => setTimeout(resolve, 30)); return blocker.load(options); } };

		await loadContentWithDiagnostics(delayed, { slowAfterMilliseconds: 0, log: (line) => lines.push(line) });

		const stall = Number(/blocked for at most (\d+) ms/.exec(lines[0] ?? "")?.[1]);

		expect(stall).toBeGreaterThanOrEqual(150);
	});

	it("lets a failed load fail the same way, with no warning", async () =>
	{
		const lines: string[] = [];
		const failing: TimedContentLoader = { load: async () => { throw new Error("disk gone"); } };

		await expect(loadContentWithDiagnostics(failing, { slowAfterMilliseconds: 0, log: (line) => lines.push(line) })).rejects.toThrow("disk gone");
		expect(lines).toEqual([]);
	});
});
