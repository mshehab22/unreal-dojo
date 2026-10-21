// The fake DojoApi keeps the IPC contract: every method exists, answers are copies, and its scenarios behave as the e2e tests expect.
import { describe, expect, it } from "vitest";

import { DOJO_METHODS } from "@shared/ipc";
import type { BuildProgressEvent } from "@shared/types/run";

import { FakeDojoApi } from "../../src/renderer/src/data/fake/FakeDojoApi";

describe("FakeDojoApi", () =>
{
	it("implements every contract method and the bridge-only functions", () =>
	{
		const fake = new FakeDojoApi("returning") as unknown as Record<string, unknown>;

		for (const method of [...DOJO_METHODS, "onBuildProgress", "isPackaged"]) expect(typeof fake[method], method).toBe("function");
	});

	it("answers copies, so a screen cannot change the fake's state by editing an answer", async () =>
	{
		const fake = new FakeDojoApi("returning");
		const first = await fake.getProgress();

		first.xp = 0;
		expect((await fake.getProgress()).xp).toBe(1240);
	});

	it("gives every map quest an availability, with a reason on each locked one", async () =>
	{
		for (const scenario of ["returning", "fresh"] as const)
		{
			const fake = new FakeDojoApi(scenario);
			const quests = (await fake.listPacks()).flatMap((pack) => pack.worlds.flatMap((world) => world.quests));
			const availability = await fake.getQuestAvailability();

			for (const quest of quests)
			{
				expect(availability[quest.id], quest.id).toBeDefined();

				if (availability[quest.id]?.status === "locked") expect(availability[quest.id]?.lockedReason, quest.id).toBeTruthy();
			}
		}
	});

	it("loads the real glossary and pattern cards", async () =>
	{
		const fake = new FakeDojoApi("returning");

		expect((await fake.getGlossary()).length).toBeGreaterThan(100);
		expect((await fake.getPatternCards()).length).toBe(22);
	});

	it("streams build progress for its run id and fails once in the first-build-fails scenario", async () =>
	{
		const fake = new FakeDojoApi("first-build-fails");
		const events: BuildProgressEvent[] = [];
		fake.onBuildProgress((event) => events.push(event));
		const engine = (await fake.detectEngines())[0];

		if (!engine) throw new Error("the fake must detect an engine");

		const failed = await fake.createSandbox({ runId: "run-1", enginePath: engine.path, folder: "/tmp/dojo" });
		const passed = await fake.createSandbox({ runId: "run-2", enginePath: engine.path, folder: "/tmp/dojo" });

		expect(failed.ok).toBe(false);
		expect(failed.compilerOutput).toContain("error");
		expect(passed.ok).toBe(true);
		expect(events.some((event) => event.runId === "run-1" && event.phase === "building")).toBe(true);
		expect((await fake.getSettings()).sandboxPath).toBe(passed.sandboxPath);
	}, 20_000);
});
