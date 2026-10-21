// Checks the build command line on both platforms and how build outcomes are reported.
import { describe, expect, it } from "vitest";

import { MacPlatformPaths } from "../../src/main/services/unreal/MacPlatformPaths";
import { BUILD_TIMEOUT_MS, UnrealBuilder } from "../../src/main/services/unreal/UnrealBuilder";
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
