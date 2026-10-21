// The renderer data layer: choosing the data source, wrapping the bridge, and the query cache.
import { describe, expect, it } from "vitest";

import { DOJO_METHODS, type DojoApi } from "@shared/ipc";
import { isAppError } from "@shared/types/errors";

import { createBridgeClient } from "../../src/renderer/src/data/createBridgeClient";
import { chooseDataSource } from "../../src/renderer/src/data/dataSourceChoice";
import { QueryCache } from "../../src/renderer/src/data/QueryCache";

describe("chooseDataSource", () =>
{
	it("uses the real bridge when nothing asks for the fake", () =>
	{
		expect(chooseDataSource(null, undefined)).toEqual({ kind: "bridge" });
		expect(chooseDataSource("bridge", "0")).toEqual({ kind: "bridge" });
	});

	it("reads a stored fake scenario, defaulting unknown ones to returning", () =>
	{
		expect(chooseDataSource("fake:fresh", undefined)).toEqual({ kind: "fake", scenario: "fresh" });
		expect(chooseDataSource("fake:nonsense", undefined)).toEqual({ kind: "fake", scenario: "returning" });
		expect(chooseDataSource("fake", undefined)).toEqual({ kind: "fake", scenario: "returning" });
	});

	it("honors the build flag, but a stored choice wins", () =>
	{
		expect(chooseDataSource(null, "1")).toEqual({ kind: "fake", scenario: "returning" });
		expect(chooseDataSource(null, "fake:first-build-fails")).toEqual({ kind: "fake", scenario: "first-build-fails" });
		expect(chooseDataSource("fake:fresh", "1")).toEqual({ kind: "fake", scenario: "fresh" });
	});
});

describe("createBridgeClient", () =>
{
	it("keeps every bridge method and answers not-implemented for content methods the bridge lacks", async () =>
	{
		const bridge = Object.fromEntries(DOJO_METHODS.map((method) => [method, () => Promise.resolve(method)])) as unknown as DojoApi;
		const client = createBridgeClient(bridge);

		await expect(client.getSettings()).resolves.toBe("getSettings");

		const rejection = await client.listPacks().catch((thrown: unknown) => thrown);
		expect(isAppError(rejection) && rejection.code).toBe("not-implemented");
	});

	it("uses the bridge's own content method once it exists", async () =>
	{
		const bridge = { getGlossary: () => Promise.resolve(["entry"]) } as unknown as DojoApi;

		await expect(createBridgeClient(bridge).getGlossary()).resolves.toEqual(["entry"]);
	});
});

describe("QueryCache", () =>
{
	it("fetches a key once, shares the answer, and refreshes on invalidate", async () =>
	{
		const cache = new QueryCache();
		let calls = 0;
		const load = (): Promise<number> => Promise.resolve(++calls);

		cache.ensure("settings", load);
		cache.ensure("settings", load);
		await cache.fetch("settings");
		expect(calls).toBe(2);
		expect(cache.read<number>("settings").data).toBe(2);

		await cache.invalidate(["sett"]);
		expect(cache.read<number>("settings")).toEqual({ data: 3, error: undefined, isLoading: false });
	});

	it("turns a rejection into an AppError and keeps the last good answer", async () =>
	{
		const cache = new QueryCache();
		let shouldFail = false;

		cache.ensure("progress", () => (shouldFail ? Promise.reject(new Error("boom")) : Promise.resolve("saved")));
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

		cache.ensure("rules", () => Promise.resolve(1));
		await cache.fetch("rules");
		const afterFetch = notified;
		unsubscribe();
		await cache.fetch("rules");

		expect(afterFetch).toBeGreaterThan(0);
		expect(notified).toBe(afterFetch);
	});
});
