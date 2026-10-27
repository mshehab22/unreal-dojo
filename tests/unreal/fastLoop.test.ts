// Checks the fast loop runner and the loop-selecting runner: what runs where, fallbacks to the headless loop, and the full-build record.
import { describe, expect, it } from "vitest";

import type { RunResult } from "@shared/types/run";
import type { LoopModeSetting } from "@shared/types/settings";

import { EditorClientError } from "../../src/main/services/unreal/EditorClientError";
import { EditorLauncher } from "../../src/main/services/unreal/EditorLauncher";
import { FullBuildLedger } from "../../src/main/services/unreal/FullBuildLedger";
import { LiveEditorRunner } from "../../src/main/services/unreal/LiveEditorRunner";
import { LoopSelectingRunner } from "../../src/main/services/unreal/LoopSelectingRunner";
import { MacPlatformPaths } from "../../src/main/services/unreal/MacPlatformPaths";
import type { PlatformPaths } from "../../src/main/services/unreal/PlatformPaths";
import type { ProgressUpdate } from "../../src/main/services/unreal/ProgressUpdate";
import { QuestFileWriter } from "../../src/main/services/unreal/QuestFileWriter";
import type { IRunner } from "../../src/main/services/unreal/Runner";
import { RunnerFactory } from "../../src/main/services/unreal/RunnerFactory";
import { WindowsPlatformPaths } from "../../src/main/services/unreal/WindowsPlatformPaths";
import { FakeEditorToolClient } from "./FakeEditorToolClient";
import { FakeProcessLauncher } from "./FakeProcessLauncher";
import { FakeSandboxFileSystem } from "./FakeSandboxFileSystem";
import { FakeTimer } from "./FakeTimer";

const TEST_NAME = "Dojo.Sample.Health.TakesDamage";
const QUEST = { id: "sample-health", title: "Sample health", tests: `IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTakesDamage, "${TEST_NAME}", EAutomationTestFlags::EditorContext)` };
const FILES = { "SampleHealthComponent.h": "#pragma once\nUCLASS() class USampleHealthComponent { GENERATED_BODY() };", "SampleHealthComponent.cpp": "// body" };
const PASSING = { tests: [{ name: TEST_NAME, state: "Success", durationSeconds: 0.02, errors: [] }, { name: "Dojo.Other.Test", state: "Fail", errors: ["not ours"] }] };

/** A headless runner that records its runs and answers a compiled, passing result. */
class RecordingHeadlessRunner implements IRunner
{
	runs = 0;
	compiles = true;

	/** Records the run and emits the event the real headless runner starts with. */
	async run(_quest: unknown, _files: unknown, onProgress: (update: ProgressUpdate) => void): Promise<RunResult>
	{
		this.runs++;
		onProgress({ phase: "preparing", lastLine: "Full build and headless tests", loop: "headless", loopReason: "headless runner's own reason" });

		return { ok: this.compiles, compiled: this.compiles, compilerOutput: "", tests: [], testsPassed: 0, testsTotal: 0, durationMs: 1, loop: "headless" };
	}
}

/** Everything a selecting-runner test needs, on the given platform. */
function createRig(paths: PlatformPaths, loopMode: LoopModeSetting = "auto")
{
	const sandboxFolder = paths.join(paths.buildPlatform === "Mac" ? "/Users/learner/Dojo" : "C:\\Dojo", "DojoSandbox");
	const engineRoot = paths.buildPlatform === "Mac" ? "/Users/learner/Applications/UE_5.8" : "C:\\Epic\\UE_5.8";
	const timer = new FakeTimer();
	const fileSystem = new FakeSandboxFileSystem();
	const client = new FakeEditorToolClient();
	const processes = new FakeProcessLauncher([{ hangs: true }, { hangs: true }]);
	const editorLauncher = new EditorLauncher({ paths, launcher: processes, timer, portProbe: { isInUse: async () => false }, createClient: () => client });
	const ledger = new FullBuildLedger();
	const headless = new RecordingHeadlessRunner();
	const writer = new QuestFileWriter(paths, fileSystem);
	const factory = new RunnerFactory(() => headless, { paths, editorLauncher, ledger, writer, timer, getLoopMode: () => loopMode, engineSupportsFastLoop: async () => true });
	const context = { engineRoot, sandboxFolder };
	const events: ProgressUpdate[] = [];

	const openEditor = () => editorLauncher.launch({ engineRoot, projectFile: paths.join(sandboxFolder, "Dojo.uproject"), port: 8000, startMcpServer: true, windowless: false });
	const run = (files: Record<string, string> = FILES) => factory.forContext(context).run(QUEST, files, (update) => events.push(update), new AbortController().signal);

	return { timer, fileSystem, client, processes, editorLauncher, ledger, headless, factory, context, events, openEditor, run };
}

/** Lets pending promise callbacks run. */
async function settle(): Promise<void>
{
	for (let step = 0; step < 5; step++) await Promise.resolve();
}

describe("RunnerFactory", () =>
{
	it("hands out the headless runner itself when no fast loop pieces are given", () =>
	{
		const headless = new RecordingHeadlessRunner();

		expect(new RunnerFactory(() => headless).forContext({ engineRoot: "/e", sandboxFolder: "/s" })).toBe(headless);
	});

	it("hands out a loop-selecting runner when they are", () =>
	{
		expect(createRig(new MacPlatformPaths("/Users/learner")).factory.forContext({ engineRoot: "/e", sandboxFolder: "/s" })).toBeInstanceOf(LoopSelectingRunner);
	});
});

describe("LoopSelectingRunner on macOS", () =>
{
	it("builds headless with the editor closed, records the build, and announces the reason once", async () =>
	{
		const rig = createRig(new MacPlatformPaths("/Users/learner"));
		rig.timer.advance(10);

		const result = await rig.run();

		expect(result.loop).toBe("headless");
		expect(rig.headless.runs).toBe(1);
		expect(rig.ledger.snapshotFor(QUEST.id)?.builtAt).toBe(10);
		expect(rig.events.filter((event) => event.loopReason !== undefined)).toEqual([{ phase: "preparing", lastLine: expect.stringMatching(/editor is not open/), loop: "headless", loopReason: expect.stringMatching(/editor is not open/) }]);
		expect(rig.events).toContainEqual({ phase: "preparing", lastLine: "Full build and headless tests" });
	});

	it("re-runs unchanged code's tests in an editor opened after the build, without writing or compiling", async () =>
	{
		const rig = createRig(new MacPlatformPaths("/Users/learner"));
		rig.ledger.recordBuild(QUEST.id, FILES, QUEST.tests, 5);
		rig.timer.advance(10);
		await rig.openEditor();
		rig.client.testAnswer = PASSING;

		const result = await rig.run();

		expect(result).toMatchObject({ ok: true, loop: "fast", compiled: true, testsPassed: 1, testsTotal: 1, tests: [{ name: TEST_NAME, passed: true, durationMs: 20 }] });
		expect(rig.client.calls).toEqual(["isAnswering", `runTests:${TEST_NAME}`]);
		expect(rig.fileSystem.writes).toEqual([]);
		expect(rig.headless.runs).toBe(0);
	});

	it("builds headless for changed code, leaves the editor open, and then counts it stale", async () =>
	{
		const rig = createRig(new MacPlatformPaths("/Users/learner"));
		rig.ledger.recordBuild(QUEST.id, FILES, QUEST.tests, 5);
		rig.timer.advance(10);
		await rig.openEditor();
		rig.timer.advance(10);

		await rig.run({ ...FILES, "SampleHealthComponent.cpp": "// changed" });

		expect(rig.headless.runs).toBe(1);
		expect(rig.editorLauncher.current()).not.toBeNull();
		expect(rig.processes.exitRequestCount).toBe(0);

		rig.events.length = 0;
		await rig.run({ ...FILES, "SampleHealthComponent.cpp": "// changed" });

		expect(rig.events[0]?.loopReason).toMatch(/Restart the editor/);
	});

	it("falls back to the headless loop when the editor does not know the quest's tests", async () =>
	{
		const rig = createRig(new MacPlatformPaths("/Users/learner"));
		rig.ledger.recordBuild(QUEST.id, FILES, QUEST.tests, 5);
		rig.timer.advance(10);
		await rig.openEditor();
		rig.client.testAnswer = { tests: [] };

		const result = await rig.run();

		expect(result.loop).toBe("headless");
		expect(rig.events.map((event) => event.loopReason).filter(Boolean)).toEqual([expect.stringMatching(/^Fast loop/), "Full build: the open editor does not know this quest's tests yet."]);
	});

	it("falls back to the headless loop when the editor stops answering mid-run", async () =>
	{
		const rig = createRig(new MacPlatformPaths("/Users/learner"));
		rig.ledger.recordBuild(QUEST.id, FILES, QUEST.tests, 5);
		rig.timer.advance(10);
		await rig.openEditor();
		rig.client.testAnswer = new EditorClientError("connection", "socket hang up");

		const result = await rig.run();

		expect(result.loop).toBe("headless");
		expect(rig.events.some((event) => event.loopReason?.includes("the editor stopped answering (socket hang up)"))).toBe(true);
	});

	it("falls back to the headless loop when RunTests answers with an error", async () =>
	{
		const rig = createRig(new MacPlatformPaths("/Users/learner"));
		rig.ledger.recordBuild(QUEST.id, FILES, QUEST.tests, 5);
		rig.timer.advance(10);
		await rig.openEditor();
		rig.client.testAnswer = new EditorClientError("tool", "RunTests failed: tests already running");

		const result = await rig.run();

		expect(result.loop).toBe("headless");
		expect(rig.events.some((event) => event.loopReason?.includes("could not run the tests"))).toBe(true);
	});

	it("reports a test failure from the editor with its first error", async () =>
	{
		const rig = createRig(new MacPlatformPaths("/Users/learner"));
		rig.ledger.recordBuild(QUEST.id, FILES, QUEST.tests, 5);
		rig.timer.advance(10);
		await rig.openEditor();
		rig.client.testAnswer = { tests: [{ name: TEST_NAME, state: "Fail", errors: ["Expected Health to be 70, but it was 100"] }] };

		expect(await rig.run()).toMatchObject({ ok: false, compiled: true, loop: "fast", tests: [{ name: TEST_NAME, passed: false, message: "Expected Health to be 70, but it was 100" }] });
	});

	it("never uses the editor when the headless loop is set", async () =>
	{
		const rig = createRig(new MacPlatformPaths("/Users/learner"), "headless");
		rig.ledger.recordBuild(QUEST.id, FILES, QUEST.tests, 5);
		rig.timer.advance(10);
		await rig.openEditor();

		expect((await rig.run()).loop).toBe("headless");
		expect(rig.client.calls).toEqual([]);
	});
});

describe("LoopSelectingRunner on Windows", () =>
{
	it("writes, Live Coding compiles, and runs tests for a .cpp change", async () =>
	{
		const rig = createRig(new WindowsPlatformPaths({}));
		rig.ledger.recordBuild(QUEST.id, FILES, QUEST.tests, 5);
		rig.timer.advance(10);
		await rig.openEditor();
		rig.client.testAnswer = PASSING;

		const result = await rig.run({ ...FILES, "SampleHealthComponent.cpp": "// faster" });

		expect(result).toMatchObject({ ok: true, loop: "fast", compiled: true });
		expect(rig.client.calls).toEqual(["isAnswering", "compileLiveCoding", `runTests:${TEST_NAME}`]);
		expect(rig.fileSystem.files.get("C:\\Dojo\\DojoSandbox\\Source\\Dojo\\Quests\\sample-health\\SampleHealthComponent.cpp")).toBe("// faster");
	});

	it("returns a failed Live Coding compile as a compile failure with its errors", async () =>
	{
		const rig = createRig(new WindowsPlatformPaths({}));
		rig.ledger.recordBuild(QUEST.id, FILES, QUEST.tests, 5);
		rig.timer.advance(10);
		await rig.openEditor();
		rig.client.compileAnswer = JSON.stringify({ result: "Failure", log: "Compiling SampleHealthComponent.cpp\nSampleHealthComponent.cpp(4): error C2065: 'Helth': undeclared identifier" });

		const result = await rig.run({ ...FILES, "SampleHealthComponent.cpp": "// typo" });

		expect(result).toMatchObject({ ok: false, compiled: false, loop: "fast" });
		expect(result.compilerOutput).toContain("error C2065");
		expect(rig.client.calls).not.toContain(`runTests:${TEST_NAME}`);
	});

	it("closes the editor for a full build after a reflected header change, records it, and reopens the editor", async () =>
	{
		const rig = createRig(new WindowsPlatformPaths({}));
		rig.ledger.recordBuild(QUEST.id, FILES, QUEST.tests, 5);
		rig.timer.advance(10);
		await rig.openEditor();
		rig.timer.advance(10);

		const changed = { ...FILES, "SampleHealthComponent.h": `${FILES["SampleHealthComponent.h"]}\n// new UPROPERTY soon` };
		const result = await rig.run(changed);
		await settle();

		expect(result.loop).toBe("headless");
		expect(rig.events[0]?.loopReason).toBe("Full build: SampleHealthComponent.h declares reflected types and changed since the last full build.");
		expect(rig.processes.exitRequestCount).toBe(1);
		expect(rig.ledger.snapshotFor(QUEST.id)?.files).toEqual(changed);
		expect(rig.processes.specs).toHaveLength(2);
		expect(rig.editorLauncher.current()?.launchedAt).toBe(20);
	});

	it("falls back to a full build when Live Coding says it cannot take the change", async () =>
	{
		const rig = createRig(new WindowsPlatformPaths({}));
		rig.ledger.recordBuild(QUEST.id, FILES, QUEST.tests, 5);
		rig.timer.advance(10);
		await rig.openEditor();
		rig.client.compileAnswer = new EditorClientError("tool", "CompileLiveCoding failed: Error: Live Coding is not available in this build configuration.");

		const result = await rig.run({ ...FILES, "SampleHealthComponent.cpp": "// x" });

		expect(result.loop).toBe("headless");
		expect(rig.headless.runs).toBe(1);
	});

	it.each([
		["a text answer", "Error: Live Coding is not enabled for this session. Enable it in Editor Preferences."],
		["a tool error", new EditorClientError("tool", "CompileLiveCoding failed: Error: Live Coding is not enabled for this session. Enable it in Editor Preferences.")],
	])("falls back to the headless loop, not a compile failure, when the editor says Live Coding is not enabled (%s, A1071)", async (_name, answer) =>
	{
		const rig = createRig(new WindowsPlatformPaths({}));
		rig.ledger.recordBuild(QUEST.id, FILES, QUEST.tests, 5);
		rig.timer.advance(10);
		await rig.openEditor();
		rig.client.compileAnswer = answer;

		const result = await rig.run({ ...FILES, "SampleHealthComponent.cpp": "// x" });

		expect(result).toMatchObject({ ok: true, compiled: true, loop: "headless" });
		expect(rig.headless.runs).toBe(1);
		expect(rig.events.filter((event) => event.loopReason !== undefined).at(-1)?.loopReason).toBe('Full build: Live Coding answered "unavailable".');
	});

	it("does not record a build that failed to compile", async () =>
	{
		const rig = createRig(new WindowsPlatformPaths({}));
		rig.headless.compiles = false;

		await rig.run();

		expect(rig.ledger.snapshotFor(QUEST.id)).toBeNull();
		expect(rig.ledger.lastFullBuildAt()).toBeNull();
	});
});

describe("LiveEditorRunner", () =>
{
	it("refuses a quest whose tests declare nothing", async () =>
	{
		const paths = new MacPlatformPaths("/Users/learner");
		const client = new FakeEditorToolClient();
		const session = { engineRoot: "/e", projectFile: "/s/Dojo.uproject", port: 8000, launchedAt: 0, client, isRunning: () => true, startsLiveCoding: false, isLiveCodingReady: () => false };
		const runner = new LiveEditorRunner({ context: { engineRoot: "/e", sandboxFolder: "/s" }, session, writer: new QuestFileWriter(paths, new FakeSandboxFileSystem()), timer: new FakeTimer(), liveCodingAvailable: false, fallBackToHeadless: async () => { throw new Error("no fallback expected"); } });

		const result = await runner.run({ ...QUEST, tests: "// nothing" }, FILES, () => undefined, new AbortController().signal);

		expect(result.error).toMatch(/declare no automation test/);
		expect(client.calls).toEqual([]);
	});
});
