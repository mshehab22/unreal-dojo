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
		// The failed build left its copy in the folder, so the retry rebuilds it, as the build step does.
		const passed = await fake.rebuildSandbox("run-2");

		expect(failed.ok).toBe(false);
		expect(failed.compilerOutput).toContain("error");
		expect(passed.ok).toBe(true);
		expect(events.some((event) => event.runId === "run-1" && event.phase === "building")).toBe(true);
		expect((await fake.getSettings()).sandboxPath).toBe(passed.sandboxPath);
	}, 20_000);

	it("reports a gone engine in the engine-missing scenario until another engine is chosen", async () =>
	{
		const fake = new FakeDojoApi("engine-missing");
		const before = await fake.getEnvironmentStatus();

		expect(before.engine).toBeNull();
		expect(before.engineProblem?.code).toBe("engine-not-found");
		expect((await fake.detectEngines()).map((engine) => engine.path)).not.toContain((await fake.getSettings()).enginePath);

		const picked = await fake.pickEngineFolder();
		await fake.updateSettings({ enginePath: picked?.path ?? null });

		const after = await fake.getEnvironmentStatus();

		expect(after.engine?.version).toBe("5.7.2");
		expect(after.engineProblem).toBeUndefined();
	});

	it("reports a blocking toolchain problem on both the check and the environment in the toolchain-missing scenario only", async () =>
	{
		const broken = new FakeDojoApi("toolchain-missing");
		const environment = await broken.getEnvironmentStatus();
		const check = await broken.checkToolchain();

		expect(check.ok).toBe(false);
		expect(check.problems[0]?.blocksBuild).toBe(true);
		expect(environment.toolchain?.problems[0]?.error.code).toBe("toolchain-missing");

		const fine = new FakeDojoApi("returning");

		expect((await fine.checkToolchain()).ok).toBe(true);
		expect((await fine.getEnvironmentStatus()).toolchain).toBeUndefined();
		expect((await fine.getEnvironmentStatus()).engineProblem).toBeUndefined();
	});

	it("keeps reporting the toolchain problem after a re-check in toolchain-missing, and clears it after the first re-check in toolchain-recovers", async () =>
	{
		const stuck = new FakeDojoApi("toolchain-missing");

		await stuck.checkToolchain();
		expect((await stuck.getEnvironmentStatus()).toolchain?.ok).toBe(false);

		const recovering = new FakeDojoApi("toolchain-recovers");

		expect((await recovering.getEnvironmentStatus()).toolchain?.ok).toBe(false);
		expect((await recovering.checkToolchain()).ok).toBe(true);
		expect((await recovering.getEnvironmentStatus()).toolchain).toMatchObject({ ok: true, problems: [] });
	});

	it("fails the first sandbox setup with the main process's explanation in the sandbox-setup-fails scenario, then passes", async () =>
	{
		const fake = new FakeDojoApi("sandbox-setup-fails");
		const engine = (await fake.detectEngines())[0];

		if (!engine) throw new Error("the fake must detect an engine");

		const failed = await fake.createSandbox({ runId: "run-1", enginePath: engine.path, folder: "/tmp/dojo" });
		// The failed build left its copy in the folder, so the retry rebuilds it, as the build step does.
		const passed = await fake.rebuildSandbox("run-2");

		expect(failed.ok).toBe(false);
		expect(failed.failure?.code).toBe("build-environment-failed");
		expect(passed.ok).toBe(true);
		expect(passed.failure).toBeUndefined();

		const plainFailure = new FakeDojoApi("first-build-fails");
		const guessed = await plainFailure.createSandbox({ runId: "run-3", enginePath: engine.path, folder: "/tmp/dojo" });

		expect(guessed.ok).toBe(false);
		expect(guessed.failure).toBeUndefined();
	}, 30_000);

	it("blocks the first sandbox folder pick in the folder-blocked scenario and allows the next", async () =>
	{
		const fake = new FakeDojoApi("folder-blocked");
		const first = await fake.pickSandboxFolder();
		const second = await fake.pickSandboxFolder();

		expect(first?.blockers?.length).toBe(1);
		expect(second?.blockers).toBeUndefined();
	});

	it("repeats the save notice on every read of the environment in the save-notice scenario, as the main process does", async () =>
	{
		const fake = new FakeDojoApi("save-notice");

		expect((await fake.getEnvironmentStatus()).saveNotice?.code).toBe("save-failed");
		expect((await fake.getEnvironmentStatus()).saveNotice?.code).toBe("save-failed");
		expect((await new FakeDojoApi("returning").getEnvironmentStatus()).saveNotice).toBeUndefined();
	});

	it("hands the Character screen broken pattern cards only in the screen-crash scenario", async () =>
	{
		expect((await new FakeDojoApi("screen-crash").getPatternCards())[0]).toBeNull();
		expect((await new FakeDojoApi("returning").getPatternCards())[0]).toBeTruthy();
	});

	it("in sandbox-deleted, reports the sandbox not ready and refuses a rebuild with the preflight's words until a new sandbox is set up (M5.1k)", async () =>
	{
		const fake = new FakeDojoApi("sandbox-deleted");
		const oldPath = (await fake.getSettings()).sandboxPath;
		const engine = (await fake.getEnvironmentStatus()).engine;

		if (!oldPath || !engine) throw new Error("the scenario must keep a sandbox path and a working engine");

		expect((await fake.getEnvironmentStatus()).sandbox).toEqual({ path: oldPath, ready: false });
		await expect(fake.rebuildSandbox("rebuild-1")).rejects.toMatchObject({ code: "sandbox-not-ready", suggestedAction: expect.stringContaining("Set up the sandbox again") });

		const picked = await fake.pickSandboxFolder();
		if (!picked) throw new Error("the fake picker must answer");
		const created = await fake.createSandbox({ runId: "setup-1", enginePath: engine.path, folder: picked.path });

		expect(created.ok).toBe(true);
		expect((await fake.getEnvironmentStatus()).sandbox).toEqual({ path: created.sandboxPath, ready: true });
		expect((await fake.rebuildSandbox("rebuild-2")).ok).toBe(true);
	}, 30_000);

	it("refuses a second create into a folder that already holds a copy, as main does, so a failed first build is retried by a rebuild (M5.1k)", async () =>
	{
		const fake = new FakeDojoApi("first-build-fails");
		const engine = (await fake.detectEngines())[0];

		if (!engine) throw new Error("the fake must detect an engine");

		const failed = await fake.createSandbox({ runId: "run-1", enginePath: engine.path, folder: "/tmp/dojo" });

		expect(failed.ok).toBe(false);
		expect((await fake.getSettings()).sandboxPath).toBe(failed.sandboxPath);
		await expect(fake.createSandbox({ runId: "run-2", enginePath: engine.path, folder: "/tmp/dojo" })).rejects.toMatchObject({ code: "sandbox-copy-failed", message: "The sandbox folder already has files in it." });
		expect((await fake.rebuildSandbox("run-3")).ok).toBe(true);
	}, 30_000);
});
