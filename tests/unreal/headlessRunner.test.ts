// Checks the headless loop end to end over fakes, plus the runner factory, the run registry, and the IPC run tracker.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { BuildProgressEvent } from "@shared/types/run";

import { trackRun } from "../../src/main/ipc/trackRun";
import { AutomationTestRunner } from "../../src/main/services/unreal/AutomationTestRunner";
import { HeadlessRunner } from "../../src/main/services/unreal/HeadlessRunner";
import { MacPlatformPaths } from "../../src/main/services/unreal/MacPlatformPaths";
import type { ProgressUpdate } from "../../src/main/services/unreal/ProgressUpdate";
import { QuestFileWriter } from "../../src/main/services/unreal/QuestFileWriter";
import { RunnerFactory } from "../../src/main/services/unreal/RunnerFactory";
import { RunRegistry } from "../../src/main/services/unreal/RunRegistry";
import { UnrealBuilder } from "../../src/main/services/unreal/UnrealBuilder";
import { FakeProcessLauncher, type ScriptedProcess } from "./FakeProcessLauncher";
import { FakeSandboxFileSystem } from "./FakeSandboxFileSystem";
import { FakeTimer } from "./FakeTimer";

/** The M1.2a reports. */
const PASSED_REPORT = readFileSync(join(__dirname, "fixtures", "report-passed.json"), "utf8");
const FAILED_REPORT = readFileSync(join(__dirname, "fixtures", "report-failed.json"), "utf8");

/** The sample quest as the runner sees it. */
const QUEST = { id: "sample-health", title: "Sample health", tests: "IMPLEMENT_SIMPLE_AUTOMATION_TEST(F, \"Dojo.Sample.Health.TakesDamage\", Flags)" };

/** Learner files for the sample quest. */
const FILES = { "SampleHealthComponent.h": "#pragma once", "SampleHealthComponent.cpp": "// body" };

/** A headless runner over fakes. The build and editor processes follow `scripts` in order; `report` lands in the first temp folder when the editor exits. */
function createRunner(scripts: ScriptedProcess[], report?: string)
{
	const fileSystem = new FakeSandboxFileSystem();
	const editorScript = scripts[1];
	if (editorScript && report !== undefined) editorScript.onExit = () => fileSystem.writeTextFile("/tmp/dojo-report-1/index.json", report);

	const launcher = new FakeProcessLauncher(scripts);
	const timer = new FakeTimer();
	const paths = new MacPlatformPaths("/Users/learner");
	const runner = new HeadlessRunner({
		context: { engineRoot: "/Engines/UE_5.8", sandboxFolder: "/Sandbox" },
		paths,
		fileSystem,
		writer: new QuestFileWriter(paths, fileSystem),
		builder: new UnrealBuilder(paths, launcher, timer),
		testRunner: new AutomationTestRunner(paths, launcher, timer, fileSystem),
		timer,
	});

	return { runner, fileSystem, launcher };
}

describe("HeadlessRunner", () =>
{
	it("writes, builds, tests with the quest's filter, reads the report, cleans up, and passes", async () =>
	{
		const { runner, fileSystem, launcher } = createRunner([{ exitCode: 0, lines: ["Result: Succeeded"] }, { exitCode: 0, lines: ["LogAutomationController: Display: Test Completed. Result={Success}"] }], PASSED_REPORT);
		const updates: ProgressUpdate[] = [];

		const result = await runner.run(QUEST, FILES, (update) => updates.push(update), new AbortController().signal);

		expect(result).toEqual({ ok: true, compiled: true, compilerOutput: "", tests: [{ name: "Dojo.Sample.Health.TakesDamage", passed: true, durationMs: 27 }], testsPassed: 1, testsTotal: 1, durationMs: 0, loop: "headless" });
		expect(fileSystem.files.get("/Sandbox/Source/Dojo/Quests/sample-health/SampleHealthComponent.h")).toBe("#pragma once");
		expect(launcher.specs[1]?.commandArguments[1]).toBe("-ExecCmds=Automation RunTests ^Dojo.Sample.Health.TakesDamage; Quit");
		expect(fileSystem.removedFolders).toContain("/tmp/dojo-report-1");
		expect(updates[0]).toMatchObject({ phase: "preparing", loop: "headless" });
		expect(updates.map((update) => update.phase)).toEqual(["preparing", "writing", "building", "building", "launching", "testing", "parsing"]);
	});

	it("reports a failed test with its assertion message", async () =>
	{
		const { runner } = createRunner([{ exitCode: 0 }, { exitCode: 3 }], FAILED_REPORT);

		const result = await runner.run(QUEST, FILES, () => undefined, new AbortController().signal);

		expect(result).toMatchObject({ ok: false, compiled: true, testsPassed: 0, testsTotal: 1 });
		expect(result.tests[0]?.message).toContain("Health clamps at zero");
		expect(result.error).toBeUndefined();
	});

	it("stops after a compile error with the filtered output and does not start the editor", async () =>
	{
		const { runner, launcher } = createRunner([{ exitCode: 6, lines: ["/Sandbox/Source/Dojo/Quests/sample-health/SampleHealthComponent.cpp:4:1: error: unknown type name 'flot'", "Result: Failed"] }]);

		const result = await runner.run(QUEST, FILES, () => undefined, new AbortController().signal);

		expect(result).toMatchObject({ ok: false, compiled: false, testsTotal: 0 });
		expect(result.compilerOutput).toContain("unknown type name 'flot'");
		expect(result.error).toBeUndefined();
		expect(launcher.specs).toHaveLength(1);
	});

	it("puts a pipeline problem in error and never throws", async () =>
	{
		const { runner } = createRunner([{ exitCode: 0 }, { exitCode: 134 }]);

		const crashed = await runner.run(QUEST, FILES, () => undefined, new AbortController().signal);
		const unsafe = await runner.run(QUEST, { "../x.cpp": "" }, () => undefined, new AbortController().signal);
		const noTests = await runner.run({ ...QUEST, tests: "// none" }, FILES, () => undefined, new AbortController().signal);

		expect(crashed).toMatchObject({ ok: false, compiled: true, error: expect.stringMatching(/exit code 134/) });
		expect(unsafe).toMatchObject({ ok: false, error: expect.stringMatching(/Unsafe quest file name/) });
		expect(noTests).toMatchObject({ ok: false, error: expect.stringMatching(/declare no automation test/) });
	});

	it("cancels mid-build and mid-test, killing the process each time", async () =>
	{
		const midBuild: ScriptedProcess[] = [{ hangs: true, lines: ["[1/3] Compile [Apple] SampleHealthComponent.cpp"] }];
		const midTest: ScriptedProcess[] = [{ exitCode: 0 }, { hangs: true, lines: ["LogAutomationController: Display: Running Dojo.Sample.Health.TakesDamage"] }];

		for (const [scripts, cancelOnLine] of [[midBuild, "[1/3]"], [midTest, "LogAutomationController"]] as const)
		{
			const { runner, launcher } = createRunner([...scripts]);
			const controller = new AbortController();

			const result = await runner.run(QUEST, FILES, (update) =>
			{
				if (update.lastLine.startsWith(cancelOnLine)) controller.abort();
			}, controller.signal);

			expect(result).toMatchObject({ ok: false, error: "Cancelled." });
			expect(launcher.killCount).toBeGreaterThan(0);
		}
	});
});

describe("RunnerFactory", () =>
{
	it("returns the headless runner for every context until M1.4", () =>
	{
		const made: string[] = [];
		const factory = new RunnerFactory((context) =>
		{
			made.push(context.sandboxFolder);

			return { run: async () => ({ ok: true, compiled: true, compilerOutput: "", tests: [], testsPassed: 0, testsTotal: 0, durationMs: 0, loop: "headless" }) };
		});

		factory.forContext({ engineRoot: "/E", sandboxFolder: "/S" });

		expect(made).toEqual(["/S"]);
	});
});

describe("RunRegistry and trackRun", () =>
{
	it("stamps progress with the run id and elapsed time, and forgets the run afterwards", async () =>
	{
		const registry = new RunRegistry();
		const events: BuildProgressEvent[] = [];

		const value = await trackRun("run-1", registry, (event) => events.push(event), async (onProgress) =>
		{
			onProgress({ phase: "building", lastLine: "hello" });

			return 42;
		});

		expect(value).toBe(42);
		expect(events[0]).toMatchObject({ runId: "run-1", phase: "building", lastLine: "hello" });
		expect(typeof events[0]?.elapsedMs).toBe("number");
		expect(() => registry.cancel("run-1")).toThrow(/no running build/);
	});

	it("cancelAll aborts every run and resolves once they have all ended", async () =>
	{
		const registry = new RunRegistry();
		const endsOnAbort = (_onProgress: unknown, signal: AbortSignal): Promise<void> => new Promise((resolve) => signal.addEventListener("abort", () => setTimeout(resolve, 5)));

		const first = trackRun("build-1", registry, () => undefined, endsOnAbort);
		const second = trackRun("test-2", registry, () => undefined, endsOnAbort);
		expect(registry.hasRuns()).toBe(true);

		const startedAt = Date.now();
		await registry.cancelAll(5000);

		expect(Date.now() - startedAt).toBeLessThan(1000);
		expect(registry.hasRuns()).toBe(false);
		await expect(first).rejects.toMatchObject({ appError: { code: "run-cancelled" } });
		await expect(second).rejects.toMatchObject({ appError: { code: "run-cancelled" } });
	});

	it("cancelAll stops waiting after the limit when a run never ends, and answers at once with nothing running", async () =>
	{
		const registry = new RunRegistry();
		void trackRun("stuck", registry, () => undefined, () => new Promise<void>(() => undefined));

		const startedAt = Date.now();
		await registry.cancelAll(50);

		expect(Date.now() - startedAt).toBeGreaterThanOrEqual(45);
		expect(registry.hasRuns()).toBe(true);
		await new RunRegistry().cancelAll(60_000);
	});

	it("refuses a run id already in use, and turns a cancel into run-cancelled", async () =>
	{
		const registry = new RunRegistry();
		let release: () => void = () => undefined;

		const pending = trackRun("run-2", registry, () => undefined, (_onProgress, signal) => new Promise<string>((resolve) =>
		{
			release = () => resolve("finished anyway");
			signal.addEventListener("abort", () => release());
		}));

		expect(() => registry.begin("run-2")).toThrow(/already going/);

		registry.cancel("run-2");

		await expect(pending).rejects.toMatchObject({ appError: { code: "run-cancelled" } });
	});
});
