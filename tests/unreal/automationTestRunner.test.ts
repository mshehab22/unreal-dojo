// Checks the headless test command on both platforms and how a run's report becomes test results.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { AutomationTestRunner, TEST_RUN_TIMEOUT_MS } from "../../src/main/services/unreal/AutomationTestRunner";
import { MacPlatformPaths } from "../../src/main/services/unreal/MacPlatformPaths";
import { WindowsPlatformPaths } from "../../src/main/services/unreal/WindowsPlatformPaths";
import { FakeProcessLauncher, type ScriptedProcess } from "./FakeProcessLauncher";
import { FakeSandboxFileSystem } from "./FakeSandboxFileSystem";
import { FakeTimer } from "./FakeTimer";

/** The M1.2a passing report. */
const PASSED_REPORT = readFileSync(join(__dirname, "fixtures", "report-passed.json"), "utf8");

/** A Mac request for the sample quest. */
const REQUEST = { engineRoot: "/Engines/UE_5.8", projectFile: "/Sandbox/Dojo.uproject", testNames: ["Dojo.Sample.Health.TakesDamage"], reportFolder: "/tmp/report-1", onLine: () => undefined };

/** Runs the Mac runner with one scripted editor process. */
async function runOnMac(script: ScriptedProcess, fileSystem = new FakeSandboxFileSystem(), timer = new FakeTimer(), signal = new AbortController().signal)
{
	const launcher = new FakeProcessLauncher([script]);
	const runner = new AutomationTestRunner(new MacPlatformPaths("/Users/learner"), launcher, timer, fileSystem);
	const outcome = await runner.run({ ...REQUEST, signal });

	return { outcome, launcher };
}

describe("AutomationTestRunner", () =>
{
	it("runs UnrealEditor-Cmd with the verified flags and the quest's names anchored at the start on macOS, where a $ would become a quote", async () =>
	{
		const { launcher } = await runOnMac({ exitCode: 0 });

		expect(launcher.specs[0]).toEqual({
			command: "/Engines/UE_5.8/Engine/Binaries/Mac/UnrealEditor-Cmd",
			commandArguments: ["/Sandbox/Dojo.uproject", "-ExecCmds=Automation RunTests ^Dojo.Sample.Health.TakesDamage; Quit", "-Unattended", "-NoPause", "-NullRHI", "-NoSplash", "-NoSound", "-stdout", "-FullStdOutLogOutput", "-ReportExportPath=/tmp/report-1", "-log"],
			verbatimArguments: false,
		});
	});

	it("quotes values the way Unreal's Windows parser reads them and anchors both ends of each name", () =>
	{
		const runner = new AutomationTestRunner(new WindowsPlatformPaths({}), new FakeProcessLauncher([]), new FakeTimer(), new FakeSandboxFileSystem());

		const commandArguments = runner.commandArguments({ projectFile: "C:\\Dojo Sandbox\\Dojo.uproject", testNames: ["Dojo.Sample.Health.TakesDamage", "Dojo.Sample.Health.Heals"], reportFolder: "C:\\Temp\\report 1" });

		expect(commandArguments.slice(0, 2)).toEqual(["\"C:\\Dojo Sandbox\\Dojo.uproject\"", "-ExecCmds=\"Automation RunTests ^Dojo.Sample.Health.TakesDamage$+^Dojo.Sample.Health.Heals$; Quit\""]);
		expect(commandArguments).toContain("-ReportExportPath=\"C:\\Temp\\report 1\"");
	});

	it("reads the report after the editor exits; the report decides, not the exit code", async () =>
	{
		const fileSystem = new FakeSandboxFileSystem();
		const { outcome } = await runOnMac({ exitCode: 3, onExit: () => fileSystem.writeTextFile("/tmp/report-1/index.json", PASSED_REPORT) }, fileSystem);

		expect(outcome.pipelineError).toBeUndefined();
		expect(outcome.exitCode).toBe(3);
		expect(outcome.tests).toEqual([{ name: "Dojo.Sample.Health.TakesDamage", passed: true, durationMs: 27 }]);
	});

	it("explains a run that wrote no report", async () =>
	{
		const { outcome } = await runOnMac({ exitCode: 139 });

		expect(outcome.tests).toEqual([]);
		expect(outcome.pipelineError).toMatch(/before writing a test report \(exit code 139\)/);
	});

	it("explains a run where none of the quest's tests ran", async () =>
	{
		const fileSystem = new FakeSandboxFileSystem({ "/tmp/report-1/index.json": "{\"tests\": []}" });
		const { outcome } = await runOnMac({ exitCode: 0 }, fileSystem);

		expect(outcome.pipelineError).toMatch(/None of this quest's tests ran \(Dojo.Sample.Health.TakesDamage\)/);
	});

	it("keeps only the quest's own tests when the report also lists a test whose name merely starts the same way", async () =>
	{
		const report = JSON.stringify({ tests: [
			{ fullTestPath: "Dojo.Sample.Health.TakesDamage", state: "Success", duration: 0.01 },
			{ fullTestPath: "Dojo.Sample.Health.TakesDamageOther", state: "Fail", entries: [{ event: { type: "Error", message: "another quest" } }] },
		] });
		const fileSystem = new FakeSandboxFileSystem({ "/tmp/report-1/index.json": report });

		const { outcome } = await runOnMac({ exitCode: 3 }, fileSystem);

		expect(outcome.tests).toEqual([{ name: "Dojo.Sample.Health.TakesDamage", passed: true, durationMs: 10 }]);
	});

	it("stops after 10 minutes and on cancel, killing the editor", async () =>
	{
		const timer = new FakeTimer();
		const launcher = new FakeProcessLauncher([{ hangs: true }, { hangs: true }]);
		const runner = new AutomationTestRunner(new MacPlatformPaths("/Users/learner"), launcher, timer, new FakeSandboxFileSystem());

		const timing = runner.run({ ...REQUEST, signal: new AbortController().signal });
		timer.advance(TEST_RUN_TIMEOUT_MS);
		expect((await timing).pipelineError).toMatch(/10 minutes/);

		const controller = new AbortController();
		const cancelling = runner.run({ ...REQUEST, signal: controller.signal });
		controller.abort();
		const cancelled = await cancelling;

		expect(cancelled.cancelled).toBe(true);
		expect(cancelled.pipelineError).toBeUndefined();
		expect(launcher.killCount).toBeGreaterThanOrEqual(2);
	});
});
