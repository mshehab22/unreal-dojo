// Checks the build failure explainer: every rule in order, MSVC and clang line shapes, and the conservative default that leaves the blame with the quest (A1199).
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { EngineInstall, ToolchainCheck } from "@shared/types/engine";
import type { AppErrorCode } from "@shared/types/errors";

import { AppErrorException } from "../../src/main/errors/AppErrorException";
import { BuildFailureExplainer, type EarlierQuestCode, type RunFailureEvidence } from "../../src/main/services/unreal/BuildFailureExplainer";
import { locatedErrors } from "../../src/main/services/unreal/buildErrorLocations";
import { STARTUP_CRASH_GIVE_UP_MESSAGE } from "../../src/main/services/unreal/UnrealBuilder";
import { visualStudioWorkloadMissing } from "../../src/main/services/unreal/unrealErrors";

/** The quest every run in these tests is for. */
const QUEST_ID = "f1-score-keeper";

/** The engine every run in these tests used. */
const ENGINE_ROOT = "C:\\Engines\\UE_5.8";

/** A toolchain check with nothing wrong. */
const HEALTHY_TOOLCHAIN: ToolchainCheck = { ok: true, tool: "vswhere", message: "Visual Studio 2022 is ready.", problems: [] };

/** A toolchain check whose first problem blocks the build. */
const BROKEN_TOOLCHAIN: ToolchainCheck = {
	ok: false,
	tool: "vswhere",
	message: "Visual Studio 2022 is installed, but without the workload Unreal needs.",
	problems: [{ error: visualStudioWorkloadMissing("Visual Studio 2022"), blocksBuild: true }],
};

/** The engine the fake inspection finds. */
const ENGINE: EngineInstall = { path: ENGINE_ROOT, version: "5.8.3", source: "launcher", supportsFastLoop: true };

/** What the explainer is built over. */
interface ExplainerOptions
{
	/** The toolchain check's answer, or an error to throw. */
	toolchain?: ToolchainCheck | Error;

	/** Set to make the engine inspection fail with this exception. */
	inspectFailure?: Error;
}

/** The explainer over fakes, and how many times the toolchain was checked. */
function createExplainer(options: ExplainerOptions = {})
{
	const calls = { toolchain: 0, inspections: [] as string[] };

	const explainer = new BuildFailureExplainer({
		checkToolchain: async () =>
		{
			calls.toolchain++;

			if (options.toolchain instanceof Error) throw options.toolchain;

			return options.toolchain ?? HEALTHY_TOOLCHAIN;
		},
		inspectEngine: async (engineRoot) =>
		{
			calls.inspections.push(engineRoot);

			if (options.inspectFailure) throw options.inspectFailure;

			return ENGINE;
		},
	});

	return { explainer, calls };
}

/** Reads a build log fixture. */
function log(name: string): string
{
	return readFileSync(join(__dirname, "fixtures", "build-logs", name), "utf8");
}

/** Evidence of a run that did not compile, with the given output and any overrides. */
function runEvidence(compilerOutput: string, overrides: Partial<RunFailureEvidence> = {}): RunFailureEvidence
{
	return { engineRoot: ENGINE_ROOT, questId: QUEST_ID, compiled: false, compilerOutput, earlierQuests: [], ...overrides };
}

/** The earlier quest every earlier-quest fixture breaks, from a given origin. */
function earlierDummy(origin: EarlierQuestCode["origin"]): EarlierQuestCode[]
{
	return [{ questId: "f1-training-dummy", origin }];
}

describe("locatedErrors", () =>
{
	it("reads the MSVC shape with a line, with a line and column, and the clang shape with a Windows drive letter or a Unix path", () =>
	{
		const places = locatedErrors([
			"C:\\Dojo\\DojoSandbox\\Source\\Dojo\\Quests\\a-quest\\File.cpp(14): error C2065: 'x': undeclared identifier",
			"C:\\Dojo\\DojoSandbox\\Source\\Dojo\\Quests\\b-quest\\File.cpp(21,9): error C2039: 'y'",
			"C:/Dojo/DojoSandbox/Source/Dojo/Tests/c-quest.Test.cpp:7:3: error: expected ';'",
			"/Users/learner/DojoSandbox/Source/Dojo/Support/DojoTestWorld.cpp:9:1: fatal error: 'x.h' file not found",
		].join("\n"));

		expect(places.map((error) => error.place)).toEqual([
			{ kind: "quest", questId: "a-quest" },
			{ kind: "quest", questId: "b-quest" },
			{ kind: "quest", questId: "c-quest" },
			{ kind: "support" },
		]);
	});

	it("skips warnings and notes, and files outside every known folder are unknown", () =>
	{
		const places = locatedErrors(log("warnings-only.txt") + log("linker-unresolved.txt"));

		expect(places.map((error) => error.place.kind)).toEqual(["unknown", "unknown"]);
	});

	it("matches the quest folder without regard to case or slash direction", () =>
	{
		expect(locatedErrors("c:\\dojo\\Source\\Dojo\\QUESTS\\F1-Score-Keeper\\A.cpp(1): error C1: x")[0]?.place).toEqual({ kind: "quest", questId: "f1-score-keeper" });
	});
});

describe("BuildFailureExplainer rule 1: known outside failures", () =>
{
	const cases: { fixture: string; code: AppErrorCode; messagePart: string }[] = [
		{ fixture: "live-coding-active.txt", code: "build-environment-failed", messagePart: "Live Coding" },
		{ fixture: "disk-full-msvc.txt", code: "build-environment-failed", messagePart: "disk is full" },
		{ fixture: "disk-full-clang.txt", code: "build-environment-failed", messagePart: "disk is full" },
		{ fixture: "file-locked-lnk1104.txt", code: "build-environment-failed", messagePart: "another program is using it" },
		{ fixture: "file-locked-other-process.txt", code: "build-environment-failed", messagePart: "another program is using it" },
		{ fixture: "path-too-long.txt", code: "sandbox-path-too-long", messagePart: "too long for Windows" },
		{ fixture: "visual-studio-missing.txt", code: "toolchain-missing", messagePart: "Visual Studio" },
		{ fixture: "windows-sdk-missing.txt", code: "toolchain-missing", messagePart: "Windows SDK" },
		{ fixture: "xcode-commandlinetools.txt", code: "toolchain-missing", messagePart: "Xcode" },
	];

	it.each(cases)("explains $fixture with a plain message, an action, and the raw line as detail", async ({ fixture, code, messagePart }) =>
	{
		const { explainer, calls } = createExplainer();
		const output = log(fixture);

		const failure = await explainer.explainRun(runEvidence(output));

		expect(failure?.code).toBe(code);
		expect(failure?.message).toContain(messagePart);
		expect(failure?.suggestedAction.length).toBeGreaterThan(10);
		expect(output).toContain(failure?.detail ?? "missing detail");
		expect(calls.toolchain).toBe(0);
	});

	it("wins over lines in the learner's own folder, because the rules run in order", async () =>
	{
		const { explainer } = createExplainer();

		const failure = await explainer.explainRun(runEvidence(log("msvc-own-quest-error.txt") + log("live-coding-active.txt")));

		expect(failure?.message).toContain("Live Coding");
	});

	it("also reads the signature out of the pipeline error text", async () =>
	{
		const { explainer } = createExplainer();

		const failure = await explainer.explainRun(runEvidence("", { pipelineError: "No space left on device" }));

		expect(failure?.message).toContain("disk is full");
	});
});

describe("BuildFailureExplainer rule 2: pipeline errors", () =>
{
	it("re-inspects the engine when a program could not start and reports a moved or missing engine as the engine's own error", async () =>
	{
		const missing = new AppErrorException("engine-not-found", "That folder does not look like an Unreal Engine install.", "Pick the folder that contains the Engine folder.");
		const { explainer, calls } = createExplainer({ inspectFailure: missing });

		const failure = await explainer.explainRun(runEvidence("", { pipelineError: "The Unreal build tool could not be started (spawn UnrealBuildTool.exe ENOENT). Check the engine folder in Settings." }));

		expect(failure).toEqual(missing.appError);
		expect(calls.inspections).toEqual([ENGINE_ROOT]);
	});

	it("says the engine's programs would not run when the engine folder still inspects fine", async () =>
	{
		const { explainer } = createExplainer();

		const failure = await explainer.explainRun(runEvidence("", { pipelineError: "The headless Unreal editor could not be started (spawn EACCES). Check the engine folder in Settings." }));

		expect(failure?.code).toBe("build-environment-failed");
		expect(failure?.message).toContain("could not start one of the engine's programs");
		expect(failure?.detail).toContain("EACCES");
	});

	it("explains a plain exception from the inspection as a program that would not start", async () =>
	{
		const { explainer } = createExplainer({ inspectFailure: new Error("disk unplugged") });

		const failure = await explainer.explainRun(runEvidence("", { pipelineError: "The Unreal build tool could not be started (x)." }));

		expect(failure?.detail).toContain("disk unplugged");
	});

	const cases: { name: string; pipelineError: string; messagePart: string; compiled: boolean }[] = [
		{ name: "a build timeout", pipelineError: "The build took longer than 15 minutes and was stopped.", messagePart: "longer than its time limit", compiled: false },
		{ name: "a test timeout", pipelineError: "The test run took longer than 10 minutes and was stopped.", messagePart: "longer than its time limit", compiled: true },
		{ name: "a startup crash", pipelineError: STARTUP_CRASH_GIVE_UP_MESSAGE, messagePart: "stopped while starting", compiled: false },
		{ name: "no test report", pipelineError: "The engine stopped before writing a test report (exit code 3).", messagePart: "closed before it wrote a result", compiled: true },
		{ name: "an unreadable test report", pipelineError: "The test report is not valid JSON (Unexpected token).", messagePart: "closed before it wrote a result", compiled: true },
		{ name: "none of the quest's tests running", pipelineError: "None of this quest's tests ran (Dojo.F1.Score.Works). Check the test names in the quest's test file.", messagePart: "did not run this quest's tests", compiled: true },
		{ name: "an unexpected stop", pipelineError: "The run stopped unexpectedly: out of memory", messagePart: "stopped before it finished", compiled: false },
	];

	it.each(cases)("explains $name as outside the learner's code and keeps the runner's text as detail", async ({ pipelineError, messagePart, compiled }) =>
	{
		const { explainer, calls } = createExplainer();

		const failure = await explainer.explainRun(runEvidence("", { pipelineError, compiled }));

		expect(failure?.code).toBe("build-environment-failed");
		expect(failure?.message).toContain(messagePart);
		expect(failure?.detail).toBe(pipelineError);
		expect(calls.toolchain).toBe(0);
	});

	it("wins over compile errors in the learner's folder", async () =>
	{
		const { explainer } = createExplainer();

		const failure = await explainer.explainRun(runEvidence(log("msvc-own-quest-error.txt"), { pipelineError: "The build took longer than 15 minutes and was stopped." }));

		expect(failure?.message).toContain("longer than its time limit");
	});
});

describe("BuildFailureExplainer rule 3: the learner's own code", () =>
{
	it.each(["msvc-own-quest-error.txt", "clang-own-quest-error.txt"])("gives no unrelated failure for %s and never checks the toolchain", async (fixture) =>
	{
		const { explainer, calls } = createExplainer({ toolchain: BROKEN_TOOLCHAIN });

		expect(await explainer.explainRun(runEvidence(log(fixture)))).toBeUndefined();
		expect(calls.toolchain).toBe(0);
	});

	it("keeps the blame when the learner's lines are mixed with an earlier quest's", async () =>
	{
		const { explainer } = createExplainer({ toolchain: BROKEN_TOOLCHAIN });

		expect(await explainer.explainRun(runEvidence(log("mixed-own-and-earlier.txt"), { earlierQuests: earlierDummy("saved-code") }))).toBeUndefined();
	});

	it("gives nothing for a run that compiled and only failed its tests, or that was cancelled, or that passed", async () =>
	{
		const { explainer, calls } = createExplainer({ toolchain: BROKEN_TOOLCHAIN });

		expect(await explainer.explainRun(runEvidence("", { compiled: true }))).toBeUndefined();
		expect(await explainer.explainRun(runEvidence("", { compiled: true, pipelineError: "Cancelled." }))).toBeUndefined();
		expect(await explainer.explainRun(runEvidence("", { compiled: false, pipelineError: "Cancelled." }))).toBeUndefined();
		expect(calls.toolchain).toBe(0);
	});
});

describe("BuildFailureExplainer rule 4: an earlier quest", () =>
{
	it.each(["msvc-earlier-quest-error.txt", "clang-earlier-quest-error.txt"])("tells the learner to open or reset the earlier quest when %s came from their saved code", async (fixture) =>
	{
		const { explainer, calls } = createExplainer();

		const failure = await explainer.explainRun(runEvidence(log(fixture), { earlierQuests: earlierDummy("saved-code") }));

		expect(failure?.code).toBe("build-environment-failed");
		expect(failure?.message).toContain("earlier quest (f1-training-dummy)");
		expect(failure?.suggestedAction).toContain("Open f1-training-dummy");
		expect(failure?.suggestedAction).toContain("reset it");
		expect(failure?.detail).toContain("Quests");
		expect(calls.toolchain).toBe(0);
	});

	it.each(["msvc-earlier-quest-error.txt", "clang-earlier-quest-error.txt"])("calls it a lesson bug to report when %s came from a reference solution", async (fixture) =>
	{
		const { explainer } = createExplainer();

		const failure = await explainer.explainRun(runEvidence(log(fixture), { earlierQuests: earlierDummy("reference-solution") }));

		expect(failure?.message).toContain("bug in the lesson");
		expect(failure?.suggestedAction).toContain("report");
	});

	it("treats a quest folder the run did not name as the learner's leftover code", async () =>
	{
		const { explainer } = createExplainer();

		const failure = await explainer.explainRun(runEvidence(log("msvc-earlier-quest-error.txt")));

		expect(failure?.message).toContain("code from an earlier quest (f1-training-dummy)");
	});

	it("names the learner's quest when a reference quest and a saved one both break", async () =>
	{
		const { explainer } = createExplainer();
		const output = `${log("msvc-earlier-quest-error.txt")}C:\\Dojo\\DojoSandbox\\Source\\Dojo\\Quests\\f1-popup-target\\DojoF1PopupTarget.h(3): error C2143: syntax error\n`;

		const failure = await explainer.explainRun(runEvidence(output, { earlierQuests: [{ questId: "f1-training-dummy", origin: "reference-solution" }, { questId: "f1-popup-target", origin: "saved-code" }] }));

		expect(failure?.suggestedAction).toContain("Open f1-popup-target");
		expect(failure?.suggestedAction).not.toContain("f1-training-dummy");
	});
});

describe("BuildFailureExplainer rule 5: support code, the template, or the engine", () =>
{
	it.each(["msvc-support-error.txt", "clang-engine-error.txt", "msvc-engine-error.txt"])("suggests rebuilding the sandbox for %s", async (fixture) =>
	{
		const { explainer, calls } = createExplainer();

		const failure = await explainer.explainRun(runEvidence(log(fixture)));

		expect(failure?.code).toBe("build-environment-failed");
		expect(failure?.message).toContain("support code or in the engine");
		expect(failure?.suggestedAction).toContain("Rebuild sandbox");
		expect(failure?.detail).toContain("error");
		expect(calls.toolchain).toBe(0);
	});

	it("does not guess when errors in an earlier quest and in support code are mixed; the toolchain check decides", async () =>
	{
		const healthy = createExplainer();
		const broken = createExplainer({ toolchain: BROKEN_TOOLCHAIN });
		const evidence = runEvidence(log("mixed-earlier-and-support.txt"), { earlierQuests: earlierDummy("saved-code") });

		expect(await healthy.explainer.explainRun(evidence)).toBeUndefined();
		expect((await broken.explainer.explainRun(evidence))?.code).toBe("toolchain-missing");
	});
});

describe("BuildFailureExplainer rule 6: the toolchain check", () =>
{
	const unattributed = ["linker-unresolved.txt", "unattributed-bare-error.txt", "warnings-only.txt"];

	it.each(unattributed)("turns a blocking toolchain problem into the error for %s", async (fixture) =>
	{
		const { explainer, calls } = createExplainer({ toolchain: BROKEN_TOOLCHAIN });

		const failure = await explainer.explainRun(runEvidence(log(fixture)));

		expect(failure).toEqual(BROKEN_TOOLCHAIN.problems[0]?.error);
		expect(calls.toolchain).toBe(1);
	});

	it.each(unattributed)("keeps the blame with the quest for %s when the toolchain is healthy (A1199)", async (fixture) =>
	{
		const { explainer, calls } = createExplainer();

		expect(await explainer.explainRun(runEvidence(log(fixture)))).toBeUndefined();
		expect(calls.toolchain).toBe(1);
	});

	it("ignores a non-blocking problem and a check that throws", async () =>
	{
		const nonBlocking: ToolchainCheck = { ...HEALTHY_TOOLCHAIN, problems: [{ error: visualStudioWorkloadMissing("Visual Studio"), blocksBuild: false }] };

		expect(await createExplainer({ toolchain: nonBlocking }).explainer.explainRun(runEvidence("ERROR: x"))).toBeUndefined();
		expect(await createExplainer({ toolchain: new Error("vswhere crashed") }).explainer.explainRun(runEvidence("ERROR: x"))).toBeUndefined();
	});
});

describe("BuildFailureExplainer.explainSandbox", () =>
{
	it("explains a known outside failure and a pipeline error like a run does", async () =>
	{
		const { explainer } = createExplainer();

		expect((await explainer.explainSandbox({ engineRoot: ENGINE_ROOT, compilerOutput: log("disk-full-clang.txt") })).message).toContain("disk is full");
		expect((await explainer.explainSandbox({ engineRoot: ENGINE_ROOT, compilerOutput: "", pipelineError: "The build took longer than 15 minutes and was stopped." })).message).toContain("longer than its time limit");
	});

	it("reports a blocking toolchain problem", async () =>
	{
		const { explainer } = createExplainer({ toolchain: BROKEN_TOOLCHAIN });

		expect(await explainer.explainSandbox({ engineRoot: ENGINE_ROOT, compilerOutput: log("sandbox-first-build-failed.txt") })).toEqual(BROKEN_TOOLCHAIN.problems[0]?.error);
	});

	it("always answers: with a healthy toolchain it says the setup failed and quotes the first error line", async () =>
	{
		const { explainer } = createExplainer();

		const failure = await explainer.explainSandbox({ engineRoot: ENGINE_ROOT, compilerOutput: log("sandbox-first-build-failed.txt") });

		expect(failure.code).toBe("build-environment-failed");
		expect(failure.message).toContain("No quest code is involved");
		expect(failure.detail).toContain("C1083");
		expect((await explainer.explainSandbox({ engineRoot: ENGINE_ROOT, compilerOutput: "" })).detail).toContain("printed nothing else");
	});
});
