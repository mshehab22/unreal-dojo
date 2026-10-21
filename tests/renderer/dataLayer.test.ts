// The renderer data layer: choosing the data source (never the fake in a packaged build) and the query cache.
import { describe, expect, it } from "vitest";

import { chooseDataSource } from "../../src/renderer/src/data/dataSourceChoice";
import { QueryCache } from "../../src/renderer/src/data/QueryCache";

describe("chooseDataSource", () =>
{
	it("uses the real bridge when nothing asks for the fake", () =>
	{
		expect(chooseDataSource(null, undefined, false)).toEqual({ kind: "bridge" });
		expect(chooseDataSource("bridge", "0", false)).toEqual({ kind: "bridge" });
	});

	it("reads a stored fake scenario, defaulting unknown ones to returning", () =>
	{
		expect(chooseDataSource("fake:fresh", undefined, false)).toEqual({ kind: "fake", scenario: "fresh" });
		expect(chooseDataSource("fake:nonsense", undefined, false)).toEqual({ kind: "fake", scenario: "returning" });
		expect(chooseDataSource("fake", undefined, false)).toEqual({ kind: "fake", scenario: "returning" });
	});

	it("always uses the real bridge in a packaged build (A251)", () =>
	{
		expect(chooseDataSource("fake:fresh", "1", true)).toEqual({ kind: "bridge" });
	});

	it("honors the build flag, but a stored choice wins", () =>
	{
		expect(chooseDataSource(null, "1", false)).toEqual({ kind: "fake", scenario: "returning" });
		expect(chooseDataSource(null, "fake:first-build-fails", false)).toEqual({ kind: "fake", scenario: "first-build-fails" });
		expect(chooseDataSource("fake:fresh", "1", false)).toEqual({ kind: "fake", scenario: "fresh" });
	});
});

describe("QueryCache", () =>
{
	it("fetches on first read, refetches in the background on the next, and refreshes on invalidate", async () =>
	{
		const cache = new QueryCache();
		let calls = 0;
		const load = (): Promise<number> => Promise.resolve(++calls);

		cache.observe("settings", load);
		await cache.fetch("settings");
		expect(cache.read<number>("settings").data).toBe(2);

		cache.observe("settings", load);
		expect(cache.read<number>("settings")).toMatchObject({ data: 2, isLoading: true });

		await cache.invalidate(["sett"]);
		expect(cache.read<number>("settings")).toEqual({ data: 4, error: undefined, isLoading: false });
	});

	it("refetches on focus only what a mounted screen still reads", async () =>
	{
		const cache = new QueryCache();
		const calls = { rules: 0, glossary: 0 };
		const stopReadingGlossary = cache.observe("glossary", () => Promise.resolve(++calls.glossary));

		cache.observe("rules", () => Promise.resolve(++calls.rules));
		stopReadingGlossary();
		await cache.refetchObserved();

		expect(calls).toEqual({ rules: 2, glossary: 1 });
	});

	it("turns a rejection into an AppError and keeps the last good answer", async () =>
	{
		const cache = new QueryCache();
		let shouldFail = false;

		cache.observe("progress", () => (shouldFail ? Promise.reject(new Error("boom")) : Promise.resolve("saved")));
		await cache.fetch("progress");
		shouldFail = true;
		await cache.fetch("progress");

		const state = cache.read<string>("progress");
		expect(state.data).toBe("saved");
		expect(state.error?.code).toBe("unexpected");
		expect(state.error?.detail).toBe("boom");
	});

	it("tells subscribers about every change and stops after unsubscribe", async () =>
	{
		const cache = new QueryCache();
		let notified = 0;
		const unsubscribe = cache.subscribe(() => notified++);

		cache.observe("rules", () => Promise.resolve(1));
		await cache.fetch("rules");
		const afterFetch = notified;
		unsubscribe();
		await cache.fetch("rules");

		expect(afterFetch).toBeGreaterThan(0);
		expect(notified).toBe(afterFetch);
	});
});
