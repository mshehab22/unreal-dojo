// Real engine check of M5.1k: a sandbox that was set up and then deleted is refused by Rebuild sandbox with words that name Set up the sandbox again,
// and the call that button makes (createSandbox, the same one first run makes) builds a new sandbox in the same folder.
// Opt in with DOJO_ENGINE_ROOT=<engine root>; skipped otherwise, or when that folder has no engine (A187).
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { IPC_CHANNELS, type IpcResponse } from "@shared/ipc";
import type { SandboxSetupResult } from "@shared/types/engine";

import { createContentCatalog } from "../../src/main/content/createContentCatalog";
import { createHandlers } from "../../src/main/ipc/createHandlers";
import { registerHandlers, type WrappedHandler } from "../../src/main/ipc/registerHandlers";
import { createEngineLocator } from "../../src/main/services/unreal/createEngineLocator";
import { RunRegistry } from "../../src/main/services/unreal/RunRegistry";
import { createIntegrationServices } from "../support/createIntegrationServices";
import { assertNoForeignLiveCodingSession } from "../support/liveCodingSessions";
import { MemoryUnrealSettings } from "../unreal/MemoryUnrealSettings";

/** The engine to test against, from the environment. */
const ENGINE_ROOT = process.env.DOJO_ENGINE_ROOT ?? "";

/** True when an engine is present at that root. */
const HAS_ENGINE = ENGINE_ROOT !== "" && existsSync(join(ENGINE_ROOT, "Engine", "Build", "Build.version"));

/** The repository root. */
const REPOSITORY = join(__dirname, "..", "..");

/** Long enough for a cold full build. */
const STEP_TIMEOUT_MS = 15 * 60 * 1000;

describe.skipIf(!HAS_ENGINE)(`set up the sandbox again against ${ENGINE_ROOT || "no engine"}`, () =>
{
	// Stops at once, with the reason, when another editor's Live Coding would make every build fail (A1076).
	beforeAll(() => assertNoForeignLiveCodingSession());

	let pickedFolder = "";
	const settings = new MemoryUnrealSettings();
	const catalog = createContentCatalog(join(REPOSITORY, "content"));
	const services = HAS_ENGINE
		? createIntegrationServices({ templateFolder: join(REPOSITORY, "resources", "sandbox-template"), solutionsFolder: join(REPOSITORY, "tools", "solutions"), engineInspector: createEngineLocator(), settings, quests: catalog, learner: { isPassed: () => false, savedFiles: () => ({}) } }).services
		: null;
	const handlersByChannel = new Map<string, WrappedHandler>();

	if (services)
	{
		registerHandlers(
			{ handle: (channel, listener) => void handlersByChannel.set(channel, listener as WrappedHandler) },
			createHandlers({
				getAppVersion: () => "test",
				getEngineLocator: () => { throw new Error("not used"); },
				getContentCatalog: () => catalog,
				pickFolder: async () => null,
				progressService: {} as never,
				getSandboxService: () => services.sandboxService,
				getQuestRunService: () => services.questRunService,
				getEditorService: () => services.editorService,
				runRegistry: new RunRegistry(),
				sendProgress: () => undefined,
				progressContentService: { assertQuestOpen: async () => undefined } as never,
				settingsService: {} as never,
				readEnvironmentStatus: () => { throw new Error("not used"); },
				getReviewHandlers: () => { throw new Error("not used"); },
			}),
		);
	}

	/** Calls one IPC channel like the preload does. */
	const invoke = <Value>(channel: string, ...methodArguments: unknown[]): Promise<IpcResponse<Value>> => handlersByChannel.get(channel)!({} as Parameters<WrappedHandler>[0], ...methodArguments) as Promise<IpcResponse<Value>>;

	afterAll(async () =>
	{
		if (pickedFolder !== "") await rm(pickedFolder, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
	});

	it("sets up a sandbox the way first run does", async () =>
	{
		pickedFolder = await mkdtemp(join(tmpdir(), "dojo-setup-again-"));

		const response = await invoke<SandboxSetupResult>(IPC_CHANNELS.createSandbox, { runId: "setup-1", enginePath: ENGINE_ROOT, folder: pickedFolder });

		expect(response).toMatchObject({ ok: true, value: { ok: true } });
		expect(settings.getSandboxPath()).toMatch(/DojoSandbox$/);
	}, STEP_TIMEOUT_MS);

	it("refuses Rebuild sandbox once the sandbox folder is deleted, naming Set up the sandbox again, without starting a build", async () =>
	{
		const sandboxFolder = settings.getSandboxPath() ?? "";
		await rm(sandboxFolder, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
		expect(existsSync(sandboxFolder)).toBe(false);

		const startedAt = Date.now();
		const response = await invoke<SandboxSetupResult>(IPC_CHANNELS.rebuildSandbox, "rebuild-1");

		expect(response.ok).toBe(false);
		if (response.ok) return;
		expect(response.error).toMatchObject({ code: "sandbox-not-ready", message: expect.stringContaining(sandboxFolder) });
		expect(response.error.suggestedAction).toContain("Set up the sandbox again");
		expect(Date.now() - startedAt).toBeLessThan(10_000);
	});

	it("sets the sandbox up again in the same folder through createSandbox, the call Settings' button makes, and the build passes", async () =>
	{
		const startedAt = Date.now();

		const response = await invoke<SandboxSetupResult>(IPC_CHANNELS.createSandbox, { runId: "setup-again-1", enginePath: ENGINE_ROOT, folder: pickedFolder });

		console.log(`set up again: ${Date.now() - startedAt} ms`);
		expect(response).toMatchObject({ ok: true, value: { ok: true } });
		if (!response.ok) return;
		expect(response.value.sandboxPath).toBe(settings.getSandboxPath());
		expect(existsSync(join(response.value.sandboxPath, "Dojo.uproject"))).toBe(true);
		expect(existsSync(join(response.value.sandboxPath, "Binaries"))).toBe(true);
	}, STEP_TIMEOUT_MS);
});
