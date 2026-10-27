// Real engine check of the fast loop on this machine: open the windowless editor with its MCP server on a free port, run the sample test through RunTests, then the platform's code-change rule (Mac: the stale-editor rule, A45; Windows: Live Coding takes a .cpp change and a reflected header change reopens the editor, A1072), and quit cleanly.
// Opt in with DOJO_ENGINE_ROOT=<engine root>; skipped otherwise, or when that folder has no engine (A187). Run under the shared engine lock. The editor is always windowless (A643, A1074).
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer, type AddressInfo } from "node:net";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createEngineLocator } from "../../src/main/services/unreal/createEngineLocator";
import { createUnrealPlatform } from "../../src/main/services/unreal/createUnrealPlatform";
import { EditorLauncher, type EditorSession } from "../../src/main/services/unreal/EditorLauncher";
import { McpEditorClient } from "../../src/main/services/unreal/McpEditorClient";
import { NodeCommandRunner } from "../../src/main/services/unreal/NodeCommandRunner";
import { NodePortProbe } from "../../src/main/services/unreal/NodePortProbe";
import type { ProgressUpdate } from "../../src/main/services/unreal/ProgressUpdate";
import { SYSTEM_TIMER } from "../../src/main/services/unreal/SupervisedProcess";
import { assertNoForeignLiveCodingSession } from "../support/liveCodingSessions";
import { createIntegrationServices, LIVE_CODING_REQUESTED } from "../support/createIntegrationServices";
import { processesMentioning } from "../support/processesMentioning";
import { MemoryUnrealSettings } from "../unreal/MemoryUnrealSettings";

/** The engine to test against, from the environment. */
const ENGINE_ROOT = process.env.DOJO_ENGINE_ROOT ?? "";

/** True when an engine is present at that root. */
const HAS_ENGINE = ENGINE_ROOT !== "" && existsSync(join(ENGINE_ROOT, "Engine", "Build", "Build.version"));

/** The shipped template. */
const TEMPLATE_FOLDER = join(__dirname, "..", "..", "resources", "sandbox-template");

/** Long enough for a cold build, an editor start, or an editor quit. */
const STEP_TIMEOUT_MS = 10 * 60 * 1000;

/** How long a starting editor gets to answer on MCP. */
const EDITOR_READY_TIMEOUT_MS = 3 * 60 * 1000;

/** The sample quest's test, as the editor names it. */
const SAMPLE_TEST_NAME = "Dojo.Sample.Health.TakesDamage";

/** True on Windows without real Live Coding (the default, A1072): the editor answers "not enabled" and the fast loop hands every compile to the headless loop (A1071). */
const WINDOWS_FALLBACK = process.platform === "win32" && !LIVE_CODING_REQUESTED;

/** Measured times, printed at the end for the spec. */
const timings: Record<string, number> = {};

/** A free loopback port: listen on 0, read the port, close. */
async function freePort(): Promise<number>
{
	const server = createServer();
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const port = (server.address() as AddressInfo).port;
	await new Promise<void>((resolve) => server.close(() => resolve()));

	return port;
}

/** The sample quest as shipped in the template. */
async function sampleQuest()
{
	const questFolder = join(TEMPLATE_FOLDER, "Source", "Dojo", "Quests", "sample-health");
	const tests = await readFile(join(TEMPLATE_FOLDER, "Source", "Dojo", "Tests", "sample-health.Test.cpp"), "utf8");
	const files = {
		"SampleHealthComponent.h": await readFile(join(questFolder, "SampleHealthComponent.h"), "utf8"),
		"SampleHealthComponent.cpp": await readFile(join(questFolder, "SampleHealthComponent.cpp"), "utf8"),
	};

	return { quest: { id: "sample-health", title: "Sample health", tests }, files };
}

describe.skipIf(!HAS_ENGINE)(`fast loop against ${ENGINE_ROOT || "no engine"}`, () =>
{
	// Stops at once, with the reason, when another editor's Live Coding would make every build fail (A1076).
	beforeAll(() => assertNoForeignLiveCodingSession());

	let pickedFolder = "";
	let sandboxFolder = "";
	let port = 0;
	let session: EditorSession | null = null;
	let rig: ReturnType<typeof createRig> | null = null;

	/** Builds the real services. Called from the first test, so collecting a skipped suite starts nothing. */
	function createRig()
	{
		const locator = createEngineLocator();
		const { services, guard } = createIntegrationServices({
			templateFolder: TEMPLATE_FOLDER,
			solutionsFolder: join(__dirname, "..", "..", "tools", "solutions"),
			engineInspector: locator,
			settings: new MemoryUnrealSettings(),
			quests: { getAuthoredQuest: async () => undefined, listPacks: async () => [] },
			learner: { isPassed: () => false, savedFiles: () => ({}) },
		});
		const platform = createUnrealPlatform({ platform: process.platform, homeFolder: homedir(), environment: process.env, commandRunner: new NodeCommandRunner() });
		if (!platform) throw new Error(`No Unreal platform for ${process.platform}`);

		// Since M1.4b the services build the fast loop themselves: their runner factory chooses the loop, and their launcher is the app's one editor.
		const { editorLauncher, buildLedger: ledger, runnerFactory: factory } = services;

		return { services, guard, platform, editorLauncher, ledger, factory };
	}

	/** The rig, which the first test creates. */
	function requireRig(): ReturnType<typeof createRig>
	{
		if (!rig) throw new Error("The first test creates the rig");

		return rig;
	}

	/** Runs the sample quest through the loop-selecting runner and returns the result and its announced reasons. `cpp` changes the source file; `header` changes the source file and the reflected header. */
	async function runSample(timingName: string, change: "none" | "cpp" | "header" = "none")
	{
		const { quest, files } = await sampleQuest();
		const changedSource = change === "none" ? files : { ...files, "SampleHealthComponent.cpp": `${files["SampleHealthComponent.cpp"]}\n// changed by the fast loop integration test\n` };
		const runFiles = change === "header" ? { ...changedSource, "SampleHealthComponent.h": `${files["SampleHealthComponent.h"]}\n// changed by the fast loop integration test\n` } : changedSource;
		const reasons: string[] = [];

		const startedAt = Date.now();
		const result = await requireRig().factory.forContext({ engineRoot: ENGINE_ROOT, sandboxFolder }).run(quest, runFiles, (update: ProgressUpdate) =>
		{
			if (update.loopReason) reasons.push(update.loopReason);
		}, new AbortController().signal);
		timings[timingName] = Date.now() - startedAt;

		console.log(`${timingName}: loop=${result.loop} ok=${result.ok} ${result.testsPassed}/${result.testsTotal} in ${timings[timingName]} ms; ${reasons.join(" | ")}${result.ok ? "" : ` ${result.error ?? ""} ${result.compilerOutput}`}`);

		return { result, reasons };
	}

	/** Opens the windowless editor with MCP on the port and waits until it answers. */
	async function openEditor(timingName: string): Promise<void>
	{
		const startedAt = Date.now();
		const { editorLauncher } = requireRig();
		session = await editorLauncher.launch({ engineRoot: ENGINE_ROOT, projectFile: join(sandboxFolder, "Dojo.uproject"), port, startMcpServer: true, windowless: true, startLiveCoding: LIVE_CODING_REQUESTED });
		const answering = await editorLauncher.waitUntilAnswering(session, EDITOR_READY_TIMEOUT_MS);
		timings[timingName] = Date.now() - startedAt;

		expect(answering).toBe(true);
	}

	/** Waits for the editor the app reopened by itself after a full build (Windows) and until it answers. */
	async function waitForReopenedEditor(timingName: string, previous: EditorSession | null): Promise<void>
	{
		const { editorLauncher } = requireRig();
		const startedAt = Date.now();

		while (Date.now() - startedAt < EDITOR_READY_TIMEOUT_MS)
		{
			const current = editorLauncher.current();

			if (current !== null && current !== previous)
			{
				session = current;
				expect(await editorLauncher.waitUntilAnswering(current, EDITOR_READY_TIMEOUT_MS)).toBe(true);
				timings[timingName] = Date.now() - startedAt;

				return;
			}

			await new Promise<void>((resolve) => setTimeout(resolve, 500));
		}

		throw new Error("The editor was not reopened after the full build");
	}

	afterAll(async () =>
	{
		await rig?.editorLauncher.dispose();
		console.log(`Editor launches: ${JSON.stringify(rig?.guard.editorLaunchLines() ?? [])}`);
		console.log(`Timings (ms): ${JSON.stringify(timings)}`);

		if (pickedFolder !== "") await rm(pickedFolder, { recursive: true, force: true });
	}, STEP_TIMEOUT_MS);

	it("creates the sandbox and its first full build passes", async () =>
	{
		rig = createRig();
		pickedFolder = await mkdtemp(join(tmpdir(), "dojo-fast-loop-"));
		port = await freePort();

		const startedAt = Date.now();
		const result = await rig.services.sandboxService.create(ENGINE_ROOT, pickedFolder, () => undefined, new AbortController().signal);
		timings.createAndColdBuild = Date.now() - startedAt;

		sandboxFolder = result.sandboxPath;
		expect(result.ok).toBe(true);
	}, STEP_TIMEOUT_MS);

	it("runs headless while no editor is open, and records the full build", async () =>
	{
		const { result, reasons } = await runSample("headlessWithEditorClosed");

		expect(result).toMatchObject({ ok: true, loop: "headless", testsPassed: 1 });
		expect(reasons[0]).toMatch(/editor is not open/);
		expect(requireRig().ledger.snapshotFor("sample-health")).not.toBeNull();
	}, STEP_TIMEOUT_MS);

	it("opens the editor with the MCP server on a free port, RunTests works through it, and the runner takes this platform's path", async () =>
	{
		await openEditor("editorLaunchToAnswering");

		// RunTests straight through the editor's MCP server: the fast loop's test step, whatever the compile step does.
		const direct = await session!.client.runTests([SAMPLE_TEST_NAME]);

		expect(direct.tests.find((test) => test.name === SAMPLE_TEST_NAME)?.state).toMatch(/^success/i);

		if (WINDOWS_FALLBACK)
		{
			// The unattended windowless editor has no Live Coding, so the compile answers "not enabled" and the run falls back to a full build (A1071); that closes the editor and reopens it afterwards.
			const beforeFallback = session;
			const fallback = await runSample("fallbackRun");

			expect(fallback.result).toMatchObject({ ok: true, compiled: true, loop: "headless", testsPassed: 1, testsTotal: 1 });
			expect(fallback.result.tests[0]?.name).toBe(SAMPLE_TEST_NAME);
			expect(fallback.reasons[0]).toMatch(/Live Coding in the open editor/);
			expect(fallback.reasons[1]).toBe('Full build: Live Coding answered "unavailable".');
			expect(beforeFallback?.isRunning()).toBe(false);

			await waitForReopenedEditor("editorReopenAfterFallback", beforeFallback);

			return;
		}

		const first = await runSample("fastRunFirst");
		const second = await runSample("fastRunSecond");

		expect(first.result).toMatchObject({ ok: true, compiled: true, loop: "fast", testsPassed: 1, testsTotal: 1 });
		expect(first.result.tests[0]?.name).toBe(SAMPLE_TEST_NAME);
		expect(second.result).toMatchObject({ ok: true, loop: "fast" });
		expect(second.reasons[0]).toMatch(requireRig().platform.paths.liveCodingAvailable ? /Live Coding in the open editor/ : /only the tests run again/);
	}, STEP_TIMEOUT_MS);

	it("refuses to open a second editor on the port the first one holds, and starts no process (fix round 1)", async () =>
	{
		const { platform, guard } = requireRig();
		const secondLauncher = new EditorLauncher({ paths: platform.paths, launcher: guard, timer: SYSTEM_TIMER, portProbe: new NodePortProbe(), createClient: (clientPort) => new McpEditorClient(clientPort) });

		try
		{
			await expect(secondLauncher.launch({ engineRoot: ENGINE_ROOT, projectFile: join(sandboxFolder, "Dojo.uproject"), port, startMcpServer: true, windowless: true })).rejects.toThrow(`Port ${port} is already in use`);
			expect(secondLauncher.current()).toBeNull();
		}
		finally
		{
			// If the port was not held after all, this launcher really started an editor that nothing else tracks; never leave it running.
			await secondLauncher.dispose();
		}
	}, STEP_TIMEOUT_MS);

	// The Mac has no Live Coding, so a code change builds headless and leaves the open editor stale (A45). Windows has its own test below.
	it.skipIf(process.platform === "win32")("builds headless after a code change, then counts the open editor stale until it restarts (A45)", async () =>
	{
		const changed = await runSample("headlessAfterChange", "cpp");

		expect(changed.result).toMatchObject({ ok: true, loop: "headless" });
		expect(changed.reasons[0]).toMatch(/Live Coding is not available on the Mac/);

		const stale = await runSample("staleEditorRun", "cpp");

		expect(stale.result.loop).toBe("headless");
		expect(stale.reasons[0]).toMatch(/Restart the editor/);

		await openEditor("editorRestartToAnswering");

		const fresh = await runSample("fastRunAfterRestart", "cpp");

		expect(fresh.result).toMatchObject({ ok: true, loop: "fast", testsPassed: 1 });
	}, STEP_TIMEOUT_MS);

	// On Windows with Live Coding, a .cpp change is patched into the open editor. Without it (the default) the compile answers "not enabled" and the run builds headless. Either way a change to a reflected header goes straight to a full build, which closes the editor and opens it again afterwards (A45, A1071, A1072).
	it.skipIf(process.platform !== "win32")("takes a .cpp change in the open editor or falls back, and a reflected header change builds headless and reopens the editor", async () =>
	{
		const beforeCppChange = session;
		const patched = await runSample("afterCppChange", "cpp");

		if (WINDOWS_FALLBACK)
		{
			expect(patched.result).toMatchObject({ ok: true, compiled: true, loop: "headless", testsPassed: 1 });
			expect(patched.reasons.at(-1)).toBe('Full build: Live Coding answered "unavailable".');
			expect(beforeCppChange?.isRunning()).toBe(false);

			await waitForReopenedEditor("editorReopenAfterCppChange", beforeCppChange);
		}
		else
		{
			expect(patched.result).toMatchObject({ ok: true, compiled: true, loop: "fast", testsPassed: 1 });
			expect(patched.reasons[0]).toMatch(/Live Coding in the open editor/);
		}

		const beforeFullBuild = session;
		const rebuilt = await runSample("headlessAfterHeaderChange", "header");

		expect(rebuilt.result).toMatchObject({ ok: true, loop: "headless", testsPassed: 1 });
		expect(rebuilt.reasons[0]).toMatch(/declares reflected types/);
		expect(beforeFullBuild?.isRunning()).toBe(false);

		await waitForReopenedEditor("editorReopenAfterHeaderChange", beforeFullBuild);

		const direct = await session!.client.runTests([SAMPLE_TEST_NAME]);

		expect(direct.tests.find((test) => test.name === SAMPLE_TEST_NAME)?.state).toMatch(/^success/i);

		if (!WINDOWS_FALLBACK)
		{
			const fresh = await runSample("fastRunAfterReopen", "header");

			expect(fresh.result).toMatchObject({ ok: true, loop: "fast", testsPassed: 1 });
		}
	}, STEP_TIMEOUT_MS);

	it("quits the editor cleanly and leaves no process on the sandbox", async () =>
	{
		const startedAt = Date.now();
		await requireRig().editorLauncher.dispose();
		timings.editorClose = Date.now() - startedAt;

		expect(session?.isRunning()).toBe(false);
		expect(processesMentioning(sandboxFolder)).toBe("");

		// Every editor this suite started was windowless (A643, A1074): the guard refuses any other, and the arguments are checked here as well.
		const editorLaunches = requireRig().guard.editorLaunchLines();

		expect(editorLaunches.length).toBeGreaterThan(0);
		expect(editorLaunches.every((line) => line.includes("-NullRHI"))).toBe(true);
	}, STEP_TIMEOUT_MS);
});
