// Checks the build command line on both platforms and how build outcomes are reported.
import { describe, expect, it } from "vitest";

import { MacPlatformPaths } from "../../src/main/services/unreal/MacPlatformPaths";
import { BUILD_TIMEOUT_MS, crashedWhileStarting, STARTUP_CRASH_ATTEMPTS, STARTUP_CRASH_GIVE_UP_MESSAGE, STARTUP_CRASH_RETRY_DELAY_MS, UnrealBuilder } from "../../src/main/services/unreal/UnrealBuilder";
import { WindowsPlatformPaths } from "../../src/main/services/unreal/WindowsPlatformPaths";
import { FakeProcessLauncher, type ScriptedProcess } from "./FakeProcessLauncher";
import { FakeTimer } from "./FakeTimer";

/** Builds with a Mac builder and a scripted process, returning the outcome, the launcher, and the lines seen. */
async function buildOnMac(script: ScriptedProcess, signal = new AbortController().signal)
{
	const launcher = new FakeProcessLauncher([script]);
	const builder = new UnrealBuilder(new MacPlatformPaths("/Users/learner"), launcher, new FakeTimer());
	const seen: [string, number | null][] = [];

	const outcome = await builder.build({ engineRoot: "/Engines/UE_5.8", projectFile: "/Sandbox/Dojo.uproject", signal, onLine: (line, percent) => seen.push([line, percent]) });

	return { outcome, launcher, seen };
}

describe("UnrealBuilder", () =>
{
	it("runs Build.sh for DojoEditor Mac Development on macOS, arguments passed whole", async () =>
	{
		const { launcher } = await buildOnMac({ exitCode: 0 });

		expect(launcher.specs[0]).toEqual({
			command: "/Engines/UE_5.8/Engine/Build/BatchFiles/Mac/Build.sh",
			commandArguments: ["DojoEditor", "Mac", "Development", "-Project=/Sandbox/Dojo.uproject", "-WaitMutex", "-Progress"],
			verbatimArguments: false,
		});
	});

	it("runs UnrealBuildTool.exe for Win64 on Windows, with the project path quoted verbatim", async () =>
	{
		const launcher = new FakeProcessLauncher([{ exitCode: 0 }]);
		const builder = new UnrealBuilder(new WindowsPlatformPaths({}), launcher, new FakeTimer());

		await builder.build({ engineRoot: "C:\\Program Files\\Epic Games\\UE_5.8", projectFile: "C:\\Dojo Sandbox\\Dojo.uproject", signal: new AbortController().signal, onLine: () => undefined });

		expect(launcher.specs[0]).toEqual({
			command: "C:\\Program Files\\Epic Games\\UE_5.8\\Engine\\Binaries\\DotNET\\UnrealBuildTool\\UnrealBuildTool.exe",
			commandArguments: ["DojoEditor", "Win64", "Development", "-Project=\"C:\\Dojo Sandbox\\Dojo.uproject\"", "-WaitMutex", "-Progress"],
			verbatimArguments: true,
		});
	});

	it("succeeds on exit code 0, streams lines with percents, and keeps only filtered output", async () =>
	{
		const { outcome, seen } = await buildOnMac({ exitCode: 0, lines: ["@progress 'Compiling C++ source code...' 50%", "[1/2] Compile [Apple] SampleHealthComponent.cpp", "/S/Source/Dojo/Quests/q/A.cpp:3:1: warning: unused variable", "Result: Succeeded"] });

		expect(outcome.succeeded).toBe(true);
		expect(outcome.pipelineError).toBeUndefined();
		expect(outcome.filteredOutput).toBe("/S/Source/Dojo/Quests/q/A.cpp:3:1: warning: unused variable");
		expect(seen[0]).toEqual(["@progress 'Compiling C++ source code...' 50%", 50]);
		expect(seen[1]?.[1]).toBe(50);
		expect(seen[3]).toEqual(["Result: Succeeded", null]);
	});

	it("fails on a compile error without calling it a pipeline problem", async () =>
	{
		const { outcome } = await buildOnMac({ exitCode: 6, lines: ["/S/Source/Dojo/Quests/q/A.cpp:9:3: error: expected ';'", "Result: Failed (OtherCompilationError)"] });

		expect(outcome.succeeded).toBe(false);
		expect(outcome.exitCode).toBe(6);
		expect(outcome.pipelineError).toBeUndefined();
		expect(outcome.filteredOutput).toContain("error: expected ';'");
	});

	it("explains a build tool that cannot start", async () =>
	{
		const { outcome } = await buildOnMac({ failsToStart: true });

		expect(outcome.succeeded).toBe(false);
		expect(outcome.pipelineError).toMatch(/could not be started/);
	});

	it("kills the build after 15 minutes", async () =>
	{
		const launcher = new FakeProcessLauncher([{ hangs: true }]);
		const timer = new FakeTimer();
		const builder = new UnrealBuilder(new MacPlatformPaths("/Users/learner"), launcher, timer);

		const pending = builder.build({ engineRoot: "/E", projectFile: "/S/Dojo.uproject", signal: new AbortController().signal, onLine: () => undefined });
		timer.advance(BUILD_TIMEOUT_MS);
		const outcome = await pending;

		expect(outcome.timedOut).toBe(true);
		expect(outcome.pipelineError).toMatch(/15 minutes/);
		expect(launcher.killCount).toBeGreaterThan(0);
	});

	it("kills the build on cancel and reports it as cancelled, not as an error", async () =>
	{
		const controller = new AbortController();
		const launcher = new FakeProcessLauncher([{ hangs: true }]);
		const builder = new UnrealBuilder(new MacPlatformPaths("/Users/learner"), launcher, new FakeTimer());

		const pending = builder.build({ engineRoot: "/E", projectFile: "/S/Dojo.uproject", signal: controller.signal, onLine: () => undefined });
		controller.abort();
		const outcome = await pending;

		expect(outcome.cancelled).toBe(true);
		expect(outcome.succeeded).toBe(false);
		expect(outcome.pipelineError).toBeUndefined();
		expect(launcher.killCount).toBeGreaterThan(0);
	});
});

/** UBT's startup crash when two builds start in the same instant (seen in M1.3c): the shared log backup races, before UBT logs its log file or takes its lock. */
const STARTUP_CRASH: ScriptedProcess = {
	exitCode: 134,
	lines: [
		"Setting up bundled DotNet SDK",
		"Running dotnet Engine/Binaries/DotNET/UnrealBuildTool/UnrealBuildTool.dll DojoEditor Mac Development -Project=/S/Dojo.uproject -WaitMutex -Progress",
		"Unhandled exception. System.IO.FileNotFoundException: Could not find file '/Users/learner/Library/Application Support/Epic/UnrealBuildTool/Trace.uba'.",
		"   at EpicGames.Core.Log.BackupLogFile(FileReference outputFile)",
		"Build.sh: line 35:  5007 Abort trap: 6           dotnet Engine/Binaries/DotNET/UnrealBuildTool/UnrealBuildTool.dll \"$@\"",
	],
};

/** A FakeTimer that runs the retry pause at once, and keeps every other timer (the 15 minute limit) waiting. */
class ImmediateRetryTimer extends FakeTimer
{
	/** Runs the startup-crash pause at once, moving the clock past it. */
	override schedule(callback: () => void, delayMs: number): () => void
	{
		const cancel = super.schedule(callback, delayMs);

		if (delayMs === STARTUP_CRASH_RETRY_DELAY_MS) this.advance(delayMs);

		return cancel;
	}
}

/** Builds with scripted attempts and returns the outcome, the launcher, and the lines seen. */
async function buildWithAttempts(scripts: ScriptedProcess[], signal = new AbortController().signal)
{
	const launcher = new FakeProcessLauncher(scripts);
	const builder = new UnrealBuilder(new MacPlatformPaths("/Users/learner"), launcher, new ImmediateRetryTimer());
	const seen: string[] = [];

	const outcome = await builder.build({ engineRoot: "/E", projectFile: "/S/Dojo.uproject", signal, onLine: (line) => seen.push(line) });

	return { outcome, launcher, seen };
}

describe("UnrealBuilder startup crashes (M1.3c, A890, A891)", () =>
{
	it("tries again when UnrealBuildTool crashed while starting, and succeeds", async () =>
	{
		const { outcome, launcher, seen } = await buildWithAttempts([STARTUP_CRASH, { exitCode: 0, lines: ["Log file: /Users/learner/Library/Application Support/Epic/UnrealBuildTool/Log.txt", "Result: Succeeded"] }]);

		expect(outcome.succeeded).toBe(true);
		expect(launcher.specs).toHaveLength(2);
		expect(seen).toContain("UnrealBuildTool stopped while starting, most likely because another build started at the same moment. Trying again (attempt 2 of 3).");
	});

	it("gives up after three startup crashes and shows the raw lines that explain it", async () =>
	{
		const { outcome, launcher } = await buildWithAttempts([STARTUP_CRASH, STARTUP_CRASH, STARTUP_CRASH, { exitCode: 0 }]);

		expect(outcome.succeeded).toBe(false);
		expect(launcher.specs).toHaveLength(STARTUP_CRASH_ATTEMPTS);
		expect(outcome.filteredOutput).toContain("Unhandled exception. System.IO.FileNotFoundException");
		expect(outcome.filteredOutput).toContain("BackupLogFile");
		expect(outcome.pipelineError).toBe(STARTUP_CRASH_GIVE_UP_MESSAGE);
		expect(outcome.pipelineError).toBe("The Unreal build tool stopped while starting, three times in a row. Another Unreal build may be starting at the same moment; wait for it to finish, then try again.");
	});

	it("stops at once when cancelled during the pause before a retry: one launch, cancelled, no raw lines", async () =>
	{
		const controller = new AbortController();
		const launcher = new FakeProcessLauncher([STARTUP_CRASH, { exitCode: 0 }]);
		const builder = new UnrealBuilder(new MacPlatformPaths("/Users/learner"), launcher, new FakeTimer());

		const outcome = await builder.build({ engineRoot: "/E", projectFile: "/S/Dojo.uproject", signal: controller.signal, onLine: (line) =>
		{
			if (line.startsWith("UnrealBuildTool stopped while starting")) controller.abort();
		} });

		expect(launcher.specs).toHaveLength(1);
		expect(outcome).toMatchObject({ succeeded: false, cancelled: true, filteredOutput: "" });
		expect(outcome.pipelineError).toBeUndefined();
	});

	it("measures the whole build, every attempt and pause included", async () =>
	{
		const { outcome } = await buildWithAttempts([STARTUP_CRASH, { exitCode: 0, lines: ["Log file: /x/Log.txt"] }]);

		expect(outcome.succeeded).toBe(true);
		expect(outcome.durationMs).toBe(STARTUP_CRASH_RETRY_DELAY_MS);
	});

	it("does not retry a real build failure, or a cancelled one", async () =>
	{
		const compileError = await buildWithAttempts([{ exitCode: 6, lines: ["Log file: /x/Log.txt", "/S/Source/Dojo/Quests/q/A.cpp:3:1: error: expected ';'"] }, { exitCode: 0 }]);
		expect(compileError.launcher.specs).toHaveLength(1);
		expect(compileError.outcome.filteredOutput).toBe("/S/Source/Dojo/Quests/q/A.cpp:3:1: error: expected ';'");

		const controller = new AbortController();
		controller.abort();
		const cancelled = await buildWithAttempts([STARTUP_CRASH, { exitCode: 0 }], controller.signal);
		expect(cancelled.launcher.specs).toHaveLength(0);
	});

	it("tells a startup crash from other failures", () =>
	{
		const base = { started: true, timedOut: false, cancelled: false, durationMs: 80 };

		expect(crashedWhileStarting({ ...base, exitCode: 134, lines: STARTUP_CRASH.lines ?? [] })).toBe(true);
		expect(crashedWhileStarting({ ...base, exitCode: 134, lines: ["Log file: /x/Log.txt", "Unhandled exception. System.Exception: later"] })).toBe(false);
		expect(crashedWhileStarting({ ...base, exitCode: 0, lines: STARTUP_CRASH.lines ?? [] })).toBe(false);
		expect(crashedWhileStarting({ ...base, exitCode: null, cancelled: true, lines: STARTUP_CRASH.lines ?? [] })).toBe(false);
	});

	it("shows the last raw lines of any failed build whose lines all fell through the filter", async () =>
	{
		const { outcome } = await buildWithAttempts([{ exitCode: 5, lines: ["Log file: /x/Log.txt", "Something odd happened", "Result: Failed"] }]);

		expect(outcome.filteredOutput).toBe("Log file: /x/Log.txt\nSomething odd happened\nResult: Failed");
	});
});
