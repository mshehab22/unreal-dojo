// Real engine check of the headless loop: create a sandbox in a temp folder, build it, write the sample quest, and run its test.
// Opt in with DOJO_ENGINE_ROOT=<engine root>; skipped otherwise, or when that folder has no engine (A187).
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { afterAll, describe, expect, it } from "vitest";

import type { BuildPhase } from "@shared/types/run";

import { createEngineLocator } from "../../src/main/services/unreal/createEngineLocator";
import { createUnrealServices } from "../../src/main/services/unreal/createUnrealServices";
import type { ProgressUpdate } from "../../src/main/services/unreal/ProgressUpdate";

/** The engine to test against, from the environment. */
const ENGINE_ROOT = process.env.DOJO_ENGINE_ROOT ?? "";

/** True when an engine is present at that root. */
const HAS_ENGINE = ENGINE_ROOT !== "" && existsSync(join(ENGINE_ROOT, "Engine", "Build", "Build.version"));

/** The shipped template. */
const TEMPLATE_FOLDER = join(__dirname, "..", "..", "resources", "sandbox-template");

/** The sample quest's files and tests as shipped in the template. */
const SAMPLE_FOLDER = join(TEMPLATE_FOLDER, "Source", "Dojo", "Quests", "sample-health");

/** Long enough for a cold build and a headless editor start. */
const STEP_TIMEOUT_MS = 10 * 60 * 1000;

/** Measured times, printed at the end for the spec. */
const timings: Record<string, number> = {};

/** True when any process still mentions the folder on its command line. */
function processesMentioning(folder: string): string
{
	return spawnSync("pgrep", ["-fl", folder], { encoding: "utf8" }).stdout.trim();
}

/** Reads the sample quest as the runner receives it. */
async function sampleQuest()
{
	const tests = await readFile(join(TEMPLATE_FOLDER, "Source", "Dojo", "Tests", "sample-health.Test.cpp"), "utf8");
	const files = {
		"SampleHealthComponent.h": await readFile(join(SAMPLE_FOLDER, "SampleHealthComponent.h"), "utf8"),
		"SampleHealthComponent.cpp": await readFile(join(SAMPLE_FOLDER, "SampleHealthComponent.cpp"), "utf8"),
	};

	return { quest: { id: "sample-health", title: "Sample health", tests }, files };
}

describe.skipIf(!HAS_ENGINE)(`headless loop against ${ENGINE_ROOT || "no engine"}`, () =>
{
	let pickedFolder = "";
	let sandboxFolder = "";
	const savedPaths: string[] = [];
	const services = HAS_ENGINE ? createUnrealServices({ templateFolder: TEMPLATE_FOLDER, engineInspector: createEngineLocator(), pathStore: { setSandboxPath: (sandboxPath) => savedPaths.push(sandboxPath) } }) : null;

	afterAll(async () =>
	{
		console.log(`Timings (ms): ${JSON.stringify(timings)}`);

		if (pickedFolder !== "") await rm(pickedFolder, { recursive: true, force: true });
	});

	it("creates the sandbox and its first full build passes", async () =>
	{
		pickedFolder = await mkdtemp(join(tmpdir(), "dojo-integration-"));
		const phases = new Set<BuildPhase>();
		let lastPercent = 0;

		const startedAt = Date.now();
		const result = await services!.sandboxService.create(ENGINE_ROOT, pickedFolder, (update: ProgressUpdate) =>
		{
			phases.add(update.phase);
			if (update.percent !== undefined) lastPercent = update.percent;
		}, new AbortController().signal);
		timings.createAndColdBuild = Date.now() - startedAt;

		sandboxFolder = result.sandboxPath;
		console.log(`Sandbox: ${sandboxFolder}; first build ok=${result.ok}\n${result.compilerOutput}`);

		expect(result.ok).toBe(true);
		expect(savedPaths).toEqual([sandboxFolder]);
		expect([...phases]).toEqual(["preparing", "writing", "building"]);
		expect(lastPercent).toBeGreaterThan(0);
		expect(JSON.parse(await readFile(join(sandboxFolder, "Dojo.uproject"), "utf8")).EngineAssociation).toMatch(/^5\.\d+$/);
	}, STEP_TIMEOUT_MS);

	it("writes the sample quest, rebuilds, and its test passes", async () =>
	{
		const { quest, files } = await sampleQuest();
		const runner = services!.runnerFactory.forContext({ engineRoot: ENGINE_ROOT, sandboxFolder });
		const lines: string[] = [];

		const startedAt = Date.now();
		const result = await runner.run(quest, files, (update) => lines.push(`${update.phase}: ${update.lastLine}`), new AbortController().signal);
		timings.passingRun = Date.now() - startedAt;

		console.log(JSON.stringify(result, null, 2));

		expect(result).toMatchObject({ ok: true, compiled: true, testsPassed: 1, testsTotal: 1, loop: "headless" });
		expect(result.tests[0]?.name).toBe("Dojo.Sample.Health.TakesDamage");
		expect(processesMentioning(sandboxFolder)).toBe("");
	}, STEP_TIMEOUT_MS);

	it("builds a brand new quest folder whose test includes the quest header by bare name (A181)", async () =>
	{
		const quest = {
			id: "integration-probe",
			title: "Integration probe",
			tests: [
				"#include \"Misc/AutomationTest.h\"",
				"#if WITH_AUTOMATION_TESTS",
				"#include \"DojoProbeValue.h\"",
				"IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_Probe_Value_Seven, \"Dojo.Probe.Value.Seven\", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)",
				"bool FDojo_Probe_Value_Seven::RunTest(const FString& Parameters)",
				"{",
				"\tTestEqual(TEXT(\"Probe value\"), DojoProbeValue(), 7);",
				"\treturn true;",
				"}",
				"#endif",
				"",
			].join("\n"),
		};

		const startedAt = Date.now();
		const result = await services!.runnerFactory.forContext({ engineRoot: ENGINE_ROOT, sandboxFolder }).run(quest, { "DojoProbeValue.h": "#pragma once\n\ninline int DojoProbeValue() { return 7; }\n" }, () => undefined, new AbortController().signal);
		timings.newQuestRun = Date.now() - startedAt;

		console.log(result.compilerOutput, JSON.stringify(result.tests));
		await services!.questFileWriter.remove(sandboxFolder, quest.id);

		expect(result).toMatchObject({ ok: true, testsPassed: 1, testsTotal: 1 });
	}, STEP_TIMEOUT_MS);

	it("reports a failed assertion with its message", async () =>
	{
		const { quest, files } = await sampleQuest();
		const broken = { ...files, "SampleHealthComponent.cpp": files["SampleHealthComponent.cpp"].replace("FMath::Clamp(CurrentHealth - Damage, 0.f, MaxHealth)", "CurrentHealth - Damage") };
		expect(broken["SampleHealthComponent.cpp"]).not.toBe(files["SampleHealthComponent.cpp"]);

		const startedAt = Date.now();
		const result = await services!.runnerFactory.forContext({ engineRoot: ENGINE_ROOT, sandboxFolder }).run(quest, broken, () => undefined, new AbortController().signal);
		timings.failingRun = Date.now() - startedAt;

		console.log(JSON.stringify(result.tests));

		expect(result).toMatchObject({ ok: false, compiled: true, testsPassed: 0, testsTotal: 1 });
		expect(result.tests[0]?.message).toBeTruthy();
	}, STEP_TIMEOUT_MS);

	it("reports a compile error in the learner's file with the filtered output", async () =>
	{
		const { quest, files } = await sampleQuest();
		const broken = { ...files, "SampleHealthComponent.cpp": `${files["SampleHealthComponent.cpp"]}\nthis is not cpp;\n` };

		const startedAt = Date.now();
		const result = await services!.runnerFactory.forContext({ engineRoot: ENGINE_ROOT, sandboxFolder }).run(quest, broken, () => undefined, new AbortController().signal);
		timings.compileErrorRun = Date.now() - startedAt;

		console.log(result.compilerOutput);

		expect(result).toMatchObject({ ok: false, compiled: false, testsTotal: 0 });
		expect(result.compilerOutput).toMatch(/Quests[\\/]sample-health[\\/]SampleHealthComponent\.cpp.*error/);
	}, STEP_TIMEOUT_MS);

	it("cancels mid-build and leaves no process behind", async () =>
	{
		const { quest, files } = await sampleQuest();
		const controller = new AbortController();
		let compileLines = 0;

		const result = await services!.runnerFactory.forContext({ engineRoot: ENGINE_ROOT, sandboxFolder }).run(quest, { ...files, "SampleHealthComponent.cpp": `${files["SampleHealthComponent.cpp"]}\n// changed\n` }, (update) =>
		{
			if (update.phase === "building" && update.lastLine !== "Starting the build" && ++compileLines === 1) controller.abort();
		}, controller.signal);

		await new Promise((resolve) => setTimeout(resolve, 1000));

		expect(result.error).toBe("Cancelled.");
		expect(processesMentioning(sandboxFolder)).toBe("");
	}, STEP_TIMEOUT_MS);

	it("cancels mid-test and leaves no process behind", async () =>
	{
		const { quest, files } = await sampleQuest();
		const controller = new AbortController();

		const result = await services!.runnerFactory.forContext({ engineRoot: ENGINE_ROOT, sandboxFolder }).run(quest, files, (update) =>
		{
			if (update.phase === "launching") setTimeout(() => controller.abort(), 3000);
		}, controller.signal);

		await new Promise((resolve) => setTimeout(resolve, 1000));
		console.log(JSON.stringify(result, null, 2));

		expect(result).toMatchObject({ compiled: true, error: "Cancelled." });
		expect(processesMentioning(sandboxFolder)).toBe("");
	}, STEP_TIMEOUT_MS);
});
