// Real engine check of the fast loop on this machine: open the editor with its MCP server on a free port, run the sample test through RunTests, apply the Mac stale-editor rule, and quit cleanly.
// Opt in with DOJO_ENGINE_ROOT=<engine root>; skipped otherwise, or when that folder has no engine (A187). Run under the shared engine lock.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer, type AddressInfo } from "node:net";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { createEngineLocator } from "../../src/main/services/unreal/createEngineLocator";
import { createUnrealPlatform } from "../../src/main/services/unreal/createUnrealPlatform";
import { createUnrealServices } from "../../src/main/services/unreal/createUnrealServices";
import { EditorLauncher, type EditorSession } from "../../src/main/services/unreal/EditorLauncher";
import { FullBuildLedger } from "../../src/main/services/unreal/FullBuildLedger";
import { McpEditorClient } from "../../src/main/services/unreal/McpEditorClient";
import { NodeCommandRunner } from "../../src/main/services/unreal/NodeCommandRunner";
import { NodeProcessLauncher } from "../../src/main/services/unreal/NodeProcessLauncher";
import type { ProgressUpdate } from "../../src/main/services/unreal/ProgressUpdate";
import { RunnerFactory } from "../../src/main/services/unreal/RunnerFactory";
import { SYSTEM_TIMER } from "../../src/main/services/unreal/SupervisedProcess";

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

/** Measured times, printed at the end for the spec. */
const timings: Record<string, number> = {};

/** True when any process still mentions the folder on its command line. */
function processesMentioning(folder: string): string
{
	return spawnSync("pgrep", ["-fl", folder], { encoding: "utf8" }).stdout.trim();
}

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
	let pickedFolder = "";
	let sandboxFolder = "";
	let port = 0;
	let session: EditorSession | null = null;
	let rig: ReturnType<typeof createRig> | null = null;

	/** Builds the real services and fast loop pieces. Called from the first test, so collecting a skipped suite starts nothing. */
	function createRig()
	{
		const locator = createEngineLocator();
		const services = createUnrealServices({ templateFolder: TEMPLATE_FOLDER, engineInspector: locator, pathStore: { setSandboxPath: () => undefined } });
		const platform = createUnrealPlatform({ platform: process.platform, homeFolder: homedir(), environment: process.env, commandRunner: new NodeCommandRunner() });
		if (!platform) throw new Error(`No Unreal platform for ${process.platform}`);

		const editorLauncher = new EditorLauncher({ paths: platform.paths, launcher: new NodeProcessLauncher(platform.processTreeKiller), timer: SYSTEM_TIMER, createClient: (clientPort) => new McpEditorClient(clientPort) });
		const ledger = new FullBuildLedger();
		const factory = new RunnerFactory((context) => services.runnerFactory.forContext(context), {
			paths: platform.paths,
			editorLauncher,
			ledger,
			writer: services.questFileWriter,
			timer: SYSTEM_TIMER,
			getLoopMode: () => "auto",
			engineSupportsFastLoop: async (engineRoot) => (await locator.inspectFolder(engineRoot)).supportsFastLoop,
		});

		return { services, platform, editorLauncher, ledger, factory };
	}

	/** The rig, which the first test creates. */
	function requireRig(): ReturnType<typeof createRig>
	{
		if (!rig) throw new Error("The first test creates the rig");

		return rig;
	}

	/** Runs the sample quest (or changed files) through the loop-selecting runner and returns the result and its announced reason. */
	async function runSample(timingName: string, changeSource = false)
	{
		const { quest, files } = await sampleQuest();
		const runFiles = changeSource ? { ...files, "SampleHealthComponent.cpp": `${files["SampleHealthComponent.cpp"]}\n// changed by the fast loop integration test\n` } : files;
		const reasons: string[] = [];

		const startedAt = Date.now();
		const result = await requireRig().factory.forContext({ engineRoot: ENGINE_ROOT, sandboxFolder }).run(quest, runFiles, (update: ProgressUpdate) =>
		{
			if (update.loopReason) reasons.push(update.loopReason);
		}, new AbortController().signal);
		timings[timingName] = Date.now() - startedAt;

		console.log(`${timingName}: loop=${result.loop} ok=${result.ok} ${result.testsPassed}/${result.testsTotal} in ${timings[timingName]} ms; ${reasons.join(" | ")}`);

		return { result, reasons };
	}

	/** Opens the windowless editor with MCP on the port and waits until it answers. */
	async function openEditor(timingName: string): Promise<void>
	{
		const startedAt = Date.now();
		const { editorLauncher } = requireRig();
		session = await editorLauncher.launch({ engineRoot: ENGINE_ROOT, projectFile: join(sandboxFolder, "Dojo.uproject"), port, startMcpServer: true, windowless: true });
		const answering = await editorLauncher.waitUntilAnswering(session, EDITOR_READY_TIMEOUT_MS);
		timings[timingName] = Date.now() - startedAt;

		expect(answering).toBe(true);
	}

	afterAll(async () =>
	{
		await rig?.editorLauncher.close();
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

	it("opens the editor with the MCP server on a free port, and the sample test passes through RunTests", async () =>
	{
		await openEditor("editorLaunchToAnswering");

		const first = await runSample("fastRunFirst");
		const second = await runSample("fastRunSecond");

		expect(first.result).toMatchObject({ ok: true, compiled: true, loop: "fast", testsPassed: 1, testsTotal: 1 });
		expect(first.result.tests[0]?.name).toBe("Dojo.Sample.Health.TakesDamage");
		expect(second.result).toMatchObject({ ok: true, loop: "fast" });
		expect(second.reasons[0]).toMatch(/only the tests run again/);
	}, STEP_TIMEOUT_MS);

	it("builds headless after a code change, then counts the open editor stale until it restarts (A45)", async () =>
	{
		const changed = await runSample("headlessAfterChange", true);

		expect(changed.result).toMatchObject({ ok: true, loop: "headless" });
		expect(changed.reasons[0]).toMatch(requireRig().platform.paths.liveCodingAvailable ? /Live Coding/ : /Live Coding is not available on the Mac/);

		const stale = await runSample("staleEditorRun", true);

		expect(stale.result.loop).toBe("headless");
		expect(stale.reasons[0]).toMatch(/Restart the editor/);

		await openEditor("editorRestartToAnswering");

		const fresh = await runSample("fastRunAfterRestart", true);

		expect(fresh.result).toMatchObject({ ok: true, loop: "fast", testsPassed: 1 });
	}, STEP_TIMEOUT_MS);

	it("quits the editor cleanly and leaves no process on the sandbox", async () =>
	{
		const startedAt = Date.now();
		await requireRig().editorLauncher.close();
		timings.editorClose = Date.now() - startedAt;

		expect(session?.isRunning()).toBe(false);
		expect(processesMentioning(sandboxFolder)).toBe("");
	}, STEP_TIMEOUT_MS);
});
