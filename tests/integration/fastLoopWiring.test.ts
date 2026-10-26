// Real engine check of M1.4b: the app's own wiring. Opens the editor through the openEditor handler, runs a World 1 quest through runQuest twice (headless, then fast), and quits through the app's quit sequence with no editor left.
// Opt in with DOJO_ENGINE_ROOT=<engine root>; skipped otherwise, or when that folder has no engine (A187). Run under the shared engine lock.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { createServer, type AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { IPC_CHANNELS, type IpcResponse } from "@shared/ipc";
import type { BuildProgressEvent, RunResult } from "@shared/types/run";

import { createContentCatalog } from "../../src/main/content/createContentCatalog";
import { createHandlers } from "../../src/main/ipc/createHandlers";
import { registerHandlers, type WrappedHandler } from "../../src/main/ipc/registerHandlers";
import { createEngineLocator } from "../../src/main/services/unreal/createEngineLocator";
import { createUnrealServices, type UnrealServices } from "../../src/main/services/unreal/createUnrealServices";
import { RunRegistry } from "../../src/main/services/unreal/RunRegistry";
import { stopEngineWorkBeforeQuit } from "../../src/main/services/unreal/stopEngineWorkBeforeQuit";
import { MemoryUnrealSettings } from "../unreal/MemoryUnrealSettings";

/** The engine to test against, from the environment. */
const ENGINE_ROOT = process.env.DOJO_ENGINE_ROOT ?? "";

/** True when an engine is present at that root. */
const HAS_ENGINE = ENGINE_ROOT !== "" && existsSync(join(ENGINE_ROOT, "Engine", "Build", "Build.version"));

/** The repository root. */
const REPOSITORY = join(__dirname, "..", "..");

/** Long enough for a cold build, an editor start, or an editor quit. */
const STEP_TIMEOUT_MS = 10 * 60 * 1000;

/** A World 1 quest with no earlier quests to fill. */
const QUEST_ID = "f1-training-dummy";

/** Measured times, printed at the end for the docs. */
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

/** True when any process still mentions the folder on its command line. */
function processesMentioning(folder: string): string
{
	return spawnSync("pgrep", ["-fl", folder], { encoding: "utf8" }).stdout.trim();
}

/** The quest's reference solution as a learner's file map. */
async function solutionFiles(questId: string): Promise<Record<string, string>>
{
	const folder = join(REPOSITORY, "tools", "solutions", questId);
	const files: Record<string, string> = {};

	for (const fileName of await readdir(folder)) files[fileName] = await readFile(join(folder, fileName), "utf8");

	return files;
}

describe.skipIf(!HAS_ENGINE)(`fast loop wiring against ${ENGINE_ROOT || "no engine"}`, () =>
{
	let pickedFolder = "";
	let services: UnrealServices | null = null;
	const events: BuildProgressEvent[] = [];
	const settings = new MemoryUnrealSettings();
	const runRegistry = new RunRegistry();
	const handlersByChannel = new Map<string, WrappedHandler>();

	/** A stand-in for Electron's app: before-quit listeners and a quit that resolves `quitted`. */
	let beforeQuit: (event: { preventDefault(): void }) => void = () => undefined;
	let resolveQuit: () => void = () => undefined;
	const quitted = new Promise<void>((resolve) => (resolveQuit = resolve));
	const app = { on: (_eventName: "before-quit", listener: typeof beforeQuit) => void (beforeQuit = listener), quit: () => resolveQuit() };

	/** Calls one IPC channel like the preload does. */
	const invoke = <Value>(channel: string, ...methodArguments: unknown[]): Promise<IpcResponse<Value>> => handlersByChannel.get(channel)!({} as Parameters<WrappedHandler>[0], ...methodArguments) as Promise<IpcResponse<Value>>;

	/** Runs the quest's reference solution through runQuest and returns the result and its loop reason. */
	async function runQuest(runId: string, timingName: string): Promise<{ result: RunResult; reason: string }>
	{
		events.length = 0;
		const startedAt = Date.now();
		const response = await invoke<RunResult>(IPC_CHANNELS.runQuest, { runId, questId: QUEST_ID, files: await solutionFiles(QUEST_ID) });
		timings[timingName] = Date.now() - startedAt;

		if (!response.ok) throw new Error(`runQuest failed: ${JSON.stringify(response.error)}`);

		const reason = events.find((event) => event.loopReason !== undefined)?.loopReason ?? "";
		console.log(`${timingName}: loop=${response.value.loop} ok=${response.value.ok} ${response.value.testsPassed}/${response.value.testsTotal} in ${timings[timingName]} ms; ${reason}`);

		return { result: response.value, reason };
	}

	afterAll(async () =>
	{
		await services?.editorLauncher.dispose();
		console.log(`Timings (ms): ${JSON.stringify(timings)}`);

		if (pickedFolder !== "") await rm(pickedFolder, { recursive: true, force: true });
	}, STEP_TIMEOUT_MS);

	it("creates the sandbox through createSandbox", async () =>
	{
		settings.mcpPort = await freePort();
		const catalog = createContentCatalog(join(REPOSITORY, "content"));
		const built = createUnrealServices({ templateFolder: join(REPOSITORY, "resources", "sandbox-template"), solutionsFolder: join(REPOSITORY, "tools", "solutions"), engineInspector: createEngineLocator(), settings, quests: catalog, learner: { isPassed: () => false, savedFiles: () => ({}) } });
		services = built;

		registerHandlers(
			{ handle: (channel, listener) => void handlersByChannel.set(channel, listener as WrappedHandler) },
			createHandlers({
				getAppVersion: () => "test",
				getEngineLocator: () => { throw new Error("not used"); },
				getContentCatalog: () => catalog,
				pickFolder: async () => null,
				progressService: {} as never,
				getSandboxService: () => built.sandboxService,
				getQuestRunService: () => built.questRunService,
				getEditorService: () => built.editorService,
				getReviewHandlers: () => { throw new Error("not used"); },
				runRegistry,
				sendProgress: (event) => events.push(event),
				progressContentService: { assertQuestOpen: async () => undefined } as never,
				settingsService: {} as never,
				readEnvironmentStatus: () => { throw new Error("not used"); },
			}),
		);
		stopEngineWorkBeforeQuit(app, { runs: runRegistry, editorLauncher: () => built.editorLauncher });

		pickedFolder = await mkdtemp(join(tmpdir(), "dojo-fast-wiring-"));
		const startedAt = Date.now();
		const response = await invoke(IPC_CHANNELS.createSandbox, { runId: "setup-1", enginePath: ENGINE_ROOT, folder: pickedFolder });
		timings.createAndColdBuild = Date.now() - startedAt;

		expect(response).toMatchObject({ ok: true, value: { ok: true } });
		expect(built.buildLedger.lastFullBuildAt()).not.toBeNull();
	}, STEP_TIMEOUT_MS);

	it("runs the quest headless while no editor is open", async () =>
	{
		const { result, reason } = await runQuest("run-1", "firstRunHeadless");

		expect(result).toMatchObject({ ok: true, compiled: true, loop: "headless" });
		expect(reason).toMatch(/editor is not open/);
	}, STEP_TIMEOUT_MS);

	it("opens the editor through openEditor on the MCP port from settings, and it reports connected", async () =>
	{
		const startedAt = Date.now();
		const response = await invoke(IPC_CHANNELS.openEditor, null);
		timings.openEditorUntilAnswering = Date.now() - startedAt;

		expect(response).toEqual({ ok: true });
		expect(services!.editorLauncher.current()?.port).toBe(settings.mcpPort);
		expect(await services!.editorService.isConnected()).toBe(true);

		// A second openEditor keeps the fresh editor.
		expect(await invoke(IPC_CHANNELS.openEditor, QUEST_ID)).toEqual({ ok: true });
		expect(services!.editorLauncher.current()?.launchedAt).toBeDefined();
	}, STEP_TIMEOUT_MS);

	it("runs the same quest again through runQuest in the fast loop", async () =>
	{
		const { result, reason } = await runQuest("run-2", "secondRunFast");

		expect(result).toMatchObject({ ok: true, compiled: true, loop: "fast" });
		expect(result.testsTotal).toBeGreaterThan(0);
		expect(reason).toMatch(/^Fast loop/);
	}, STEP_TIMEOUT_MS);

	it("quits through the app's quit sequence: the quit is held, the editor closes, and nothing is left on the sandbox", async () =>
	{
		const sandboxFolder = settings.getSandboxPath()!;
		let held = false;
		const startedAt = Date.now();

		beforeQuit({ preventDefault: () => (held = true) });
		await quitted;
		timings.quit = Date.now() - startedAt;

		expect(held).toBe(true);
		expect(services!.editorLauncher.current()).toBeNull();
		expect(await services!.editorLauncher.reopen()).toBeNull();
		expect(processesMentioning(sandboxFolder)).toBe("");
	}, STEP_TIMEOUT_MS);
});
