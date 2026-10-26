// Checks the IPC boundary: every channel has a handler, bad payloads and thrown errors come back as AppErrors, and main never throws.
import { describe, expect, it } from "vitest";

import { DOJO_METHODS, IPC_CHANNELS, type IpcResponse } from "@shared/ipc";
import { isAppError } from "@shared/types/errors";

import { AppErrorException } from "../src/main/errors/AppErrorException";
import { createHandlers, type ContentCatalogService, type HandlerDependencies } from "../src/main/ipc/createHandlers";
import type { HandlerDefinition } from "../src/main/ipc/HandlerDefinition";
import { idSchema, playerNameSchema } from "../src/main/ipc/requestSchemas";
import { registerHandlers, wrapHandler, type IpcHandleRegistrar, type WrappedHandler } from "../src/main/ipc/registerHandlers";
import { createTestProgressContent } from "./support/contentFixture";
import { createTestProgressService } from "./support/progressFixtures";
import { SettingsService } from "../src/main/services/settings/SettingsService";
import { RunRegistry } from "../src/main/services/unreal/RunRegistry";
import { FakeSecretEncryptor, FakeSettingsChecks, MemorySettingsStore } from "./settings/settingsFakes";

/** A fake toolchain answer the engine handlers pass through. */
const FAKE_TOOLCHAIN = { ok: true, tool: "xcode-select", message: "Xcode 27.1 is selected.", toolVersion: "27.1", problems: [] } as const;

/** A fake content catalog: one empty pack, one world, and a quest lookup that knows a single id. */
const FAKE_CONTENT_CATALOG: ContentCatalogService = {
	getStatus: async () => ({ root: "/content", packCount: 1, questCount: 0, glossaryCount: 0, patternCount: 0, problems: [] }),
	listPacks: async () => [{ id: "foundations", title: "Foundations", summary: "", order: 1, worlds: [] }],
	getWorld: async (worldId) =>
	{
		if (worldId !== "objects") throw new AppErrorException("world-not-found", "That world is not in the loaded lessons.", "Go back.", worldId);
		return { id: "objects", title: "Objects", summary: "", order: 1, quests: [] };
	},
	getQuest: async (questId) =>
	{
		throw new AppErrorException("quest-not-found", "That quest is not in the loaded lessons.", "Go back.", questId);
	},
	getGlossary: async () => [],
	getGlossaryAliases: async () => [{ text: "AActor", entryId: "actor", caseSensitive: true, codeOnly: false, short: "A thing in a level." }],
	getPatternCards: async () => [],
};

/** Handler dependencies with a fixed version and a fake engine locator that finds one engine. */
/** Quest ids whose sandbox files the fake run service was asked to remove. */
const removedQuestFiles: string[] = [];

/** One entry per openEditor call the fake editor service received. */
const editorOpens: string[] = [];

const FAKE_DEPENDENCIES: HandlerDependencies = {
	getAppVersion: () => "9.9.9",
	getEngineLocator: () => ({
		findEngines: async () => [{ path: "/Engines/UE_5.8", version: "5.8.3", source: "launcher", supportsFastLoop: true }],
		checkToolchain: async () => ({ ...FAKE_TOOLCHAIN, problems: [] }),
		inspectFolder: async (folder) => ({ path: folder, version: "5.8.3", source: "manual", supportsFastLoop: true }),
	}),
	getContentCatalog: () => FAKE_CONTENT_CATALOG,
	pickFolder: async () => "/Picked/UE_5.8",
	progressService: createTestProgressService().service,
	getSandboxService: () => ({
		folderWarnings: (pickedFolder) => (pickedFolder.length > 10 ? ["long path"] : []),
		create: async (_enginePath, pickedFolder, onProgress) =>
		{
			onProgress({ phase: "building", lastLine: "Result: Succeeded", percent: 100 });

			return { ok: true, sandboxPath: `${pickedFolder}/DojoSandbox`, durationMs: 5, compilerOutput: "" };
		},
	}),
	getQuestRunService: () => ({
		runQuest: async (questId, files, onProgress) =>
		{
			onProgress({ phase: "writing", lastLine: `Writing ${Object.keys(files).length} file(s) for ${questId}` });

			return { ok: true, compiled: true, compilerOutput: "", tests: [{ name: "Dojo.F1.Dummy.Takes", passed: true }], testsPassed: 1, testsTotal: 1, durationMs: 9, loop: "headless" };
		},
		checkSnippetSyntax: async (code) => ({ ok: !code.includes("oops"), diagnostics: code.includes("oops") ? [{ line: 1, column: 1, severity: "error", message: "oops" }] : [] }),
		rebuildSandbox: async () => ({ ok: true, sandboxPath: "/S/DojoSandbox", durationMs: 3, compilerOutput: "" }),
		removeQuestFiles: async (questId) =>
		{
			removedQuestFiles.push(questId);
		},
	}),
	getEditorService: () => ({ openEditor: async () => void editorOpens.push("open") }),
	runRegistry: new RunRegistry(),
	sendProgress: () => undefined,
	// The progress content service reads the same fake catalog, so getWorld and getQuest answer from it.
	// Run and Submit check the quest is open first (A802); the fake catalog has no quests, so these tests treat every quest as open.
	progressContentService: Object.assign(createTestProgressContent({ source: { ...FAKE_CONTENT_CATALOG, getAuthoredQuest: async () => undefined } }).content, { assertQuestOpen: async () => undefined }),
	settingsService: new SettingsService(new MemorySettingsStore(), new FakeSecretEncryptor(), new FakeSettingsChecks()),
	readEnvironmentStatus: async () => ({ engine: null, sandbox: { path: null, ready: false }, reviewProvider: null, loopMode: "auto", editorConnected: false }),
	getReviewHandlers: () => ({
		getProviderStatuses: async () => [{ id: "tests-only", available: true }],
		testClaudeCode: async () => ({ id: "claude-code", available: false, reason: "not installed" }),
		explainFinding: async () => "because",
		answerReflection: async () => ({ score: 70, verdict: "partly", note: "n", provider: "tests-only" }),
		submitQuest: async () => { throw new Error("not used"); },
		retryReview: async () => { throw new Error("not used"); },
	}),
};

/** A stand-in for ipcMain that records each registered channel. */
function createFakeRegistrar(): { registrar: IpcHandleRegistrar; handlersByChannel: Map<string, WrappedHandler> }
{
	const handlersByChannel = new Map<string, WrappedHandler>();

	const registrar: IpcHandleRegistrar = {
		handle: (channel, listener) =>
		{
			if (handlersByChannel.has(channel)) throw new Error(`channel registered twice: ${channel}`);
			handlersByChannel.set(channel, listener as WrappedHandler);
		},
	};

	return { registrar, handlersByChannel };
}

/** Registers the real handler table on a fake registrar and returns a function that calls one channel like the preload does. */
function createInvoker(): (channel: string, ...methodArguments: unknown[]) => Promise<IpcResponse<unknown>>
{
	const { registrar, handlersByChannel } = createFakeRegistrar();
	registerHandlers(registrar, createHandlers(FAKE_DEPENDENCIES));

	return (channel, ...methodArguments) =>
	{
		const handler = handlersByChannel.get(channel);
		if (!handler) throw new Error(`no handler for ${channel}`);

		// The handlers never read the event, so an empty object stands in for it.
		return handler({} as Parameters<WrappedHandler>[0], ...methodArguments);
	};
}

/** Asserts that a response is a failure with the given AppError code and returns the error. */
function expectError(response: IpcResponse<unknown>, code: string)
{
	expect(response.ok).toBe(false);
	if (response.ok) throw new Error("expected a failure");

	expect(isAppError(response.error)).toBe(true);
	expect(response.error.code).toBe(code);

	return response.error;
}

describe("IPC_CHANNELS", () =>
{
	it("gives every method its own dojo: channel named after the method", () =>
	{
		const channelNames = Object.values(IPC_CHANNELS);

		expect(new Set(channelNames).size).toBe(channelNames.length);

		for (const method of DOJO_METHODS) expect(IPC_CHANNELS[method]).toBe(`dojo:${method}`);
	});
});

describe("registerHandlers", () =>
{
	it("registers a handler on every channel and nothing else", () =>
	{
		const { registrar, handlersByChannel } = createFakeRegistrar();
		registerHandlers(registrar, createHandlers(FAKE_DEPENDENCIES));

		expect([...handlersByChannel.keys()].sort()).toEqual(Object.values(IPC_CHANNELS).sort());
	});

	it("answers getAppVersion with the injected version", async () =>
	{
		const invoke = createInvoker();

		expect(await invoke(IPC_CHANNELS.getAppVersion)).toEqual({ ok: true, value: "9.9.9" });
	});

	it("answers detectEngines and checkToolchain from the engine locator", async () =>
	{
		const invoke = createInvoker();

		expect(await invoke(IPC_CHANNELS.detectEngines)).toEqual({ ok: true, value: [{ path: "/Engines/UE_5.8", version: "5.8.3", source: "launcher", supportsFastLoop: true }] });
		expect(await invoke(IPC_CHANNELS.checkToolchain)).toEqual({ ok: true, value: FAKE_TOOLCHAIN });
	});

	it("passes an engine locator AppError through unchanged", async () =>
	{
		const { registrar, handlersByChannel } = createFakeRegistrar();
		const failingLocator = () =>
		{
			throw new AppErrorException("toolchain-missing", "Unreal Dojo works with Unreal on Windows and macOS only.", "Run Unreal Dojo on a Windows PC or a Mac.");
		};

		registerHandlers(registrar, createHandlers({ ...FAKE_DEPENDENCIES, getEngineLocator: failingLocator }));

		const handler = handlersByChannel.get(IPC_CHANNELS.detectEngines);
		if (!handler) throw new Error("no detectEngines handler");

		const error = expectError(await handler({} as Parameters<WrappedHandler>[0]), "toolchain-missing");

		expect(error.suggestedAction).toBe("Run Unreal Dojo on a Windows PC or a Mac.");
	});

	it("answers pickEngineFolder by inspecting the picked folder, and null when the picker is cancelled", async () =>
	{
		const invoke = createInvoker();

		expect(await invoke(IPC_CHANNELS.pickEngineFolder)).toEqual({ ok: true, value: { path: "/Picked/UE_5.8", version: "5.8.3", source: "manual", supportsFastLoop: true } });

		const { registrar, handlersByChannel } = createFakeRegistrar();
		registerHandlers(registrar, createHandlers({ ...FAKE_DEPENDENCIES, pickFolder: async () => null }));

		const cancelled = await handlersByChannel.get(IPC_CHANNELS.pickEngineFolder)?.({} as Parameters<WrappedHandler>[0]);
		expect(cancelled).toEqual({ ok: true, value: null });
	});

	it("answers the content channels from the content catalog", async () =>
	{
		const invoke = createInvoker();

		expect(await invoke(IPC_CHANNELS.listPacks)).toMatchObject({ ok: true, value: [{ id: "foundations" }] });
		expect(await invoke(IPC_CHANNELS.getWorld, "objects")).toMatchObject({ ok: true, value: { id: "objects" } });
		expect(await invoke(IPC_CHANNELS.getGlossaryAliases)).toMatchObject({ ok: true, value: [{ text: "AActor" }] });
		expect(await invoke(IPC_CHANNELS.getContentStatus)).toMatchObject({ ok: true, value: { packCount: 1 } });

		expectError(await invoke(IPC_CHANNELS.getWorld, "missing-world"), "world-not-found");
		expectError(await invoke(IPC_CHANNELS.getQuest, "missing-quest"), "quest-not-found");
	});

	it("checks startDrill's request and then answers from progress-and-rules (M1.6b)", async () =>
	{
		const invoke = createInvoker();

		expectError(await invoke(IPC_CHANNELS.startDrill, { kind: "test-out", packId: "foundations", worldId: "objects" }), "world-not-found");
		expectError(await invoke(IPC_CHANNELS.startDrill, { kind: "parsons-fallback", questId: "w1-health" }), "quest-not-found");
		expectError(await invoke(IPC_CHANNELS.startDrill, { kind: "due" }), "quest-locked");
		expectError(await invoke(IPC_CHANNELS.startDrill, { kind: "lucky" }), "invalid-payload");
	});

	it("answers the settings channels from the settings service and never sends the API key back", async () =>
	{
		const encryptor = new FakeSecretEncryptor();
		const { registrar, handlersByChannel } = createFakeRegistrar();
		registerHandlers(registrar, createHandlers({ ...FAKE_DEPENDENCIES, settingsService: new SettingsService(new MemorySettingsStore(), encryptor, new FakeSettingsChecks()) }));

		const call = (channel: string, ...methodArguments: unknown[]) => handlersByChannel.get(channel)?.({} as Parameters<WrappedHandler>[0], ...methodArguments) as Promise<IpcResponse<unknown>>;
		const apiKey = "sk-ant-test-abcdef0123456789";

		expect(await call(IPC_CHANNELS.setApiKey, `  ${apiKey}  `)).toEqual({ ok: true, value: undefined });

		const settings = await call(IPC_CHANNELS.getSettings);
		expect(settings).toMatchObject({ ok: true, value: { hasApiKey: true } });
		expect(JSON.stringify(settings)).not.toContain(apiKey);

		expect(await call(IPC_CHANNELS.updateSettings, { mcpPort: 8123 })).toMatchObject({ ok: true, value: { mcpPort: 8123, hasApiKey: true } });
		expectError(await call(IPC_CHANNELS.updateSettings, { mcpPort: 80 }), "invalid-payload");
		expectError(await call(IPC_CHANNELS.updateSettings, { hasApiKey: false }), "invalid-payload");
		expectError(await call(IPC_CHANNELS.updateSettings, { sandboxPath: "/definitely/not/a/sandbox" }), "invalid-payload");
		expectError(await call(IPC_CHANNELS.updateSettings, { enginePath: "/tmp" }), "engine-not-found");
		expect(await call(IPC_CHANNELS.updateSettings, { enginePath: "/Engines/UE_5.8/Engine", sandboxPath: null })).toMatchObject({ ok: true, value: { enginePath: "/Engines/UE_5.8", sandboxPath: null } });

		expect(await call(IPC_CHANNELS.clearApiKey)).toEqual({ ok: true, value: undefined });
		expect(await call(IPC_CHANNELS.getSettings)).toMatchObject({ ok: true, value: { hasApiKey: false } });

		encryptor.available = false;
		const refusal = expectError(await call(IPC_CHANNELS.setApiKey, apiKey), "secure-storage-unavailable");
		expect(JSON.stringify(refusal)).not.toContain(apiKey);

		expect(await call(IPC_CHANNELS.getEnvironmentStatus)).toMatchObject({ ok: true, value: { loopMode: "auto", editorConnected: false } });
		expectError(await call(IPC_CHANNELS.completeFirstRun), "settings-invalid");
	});

	it("answers every channel with an IpcResponse, never a throw, even with no arguments", async () =>
	{
		const invoke = createInvoker();

		for (const method of DOJO_METHODS)
		{
			const response = await invoke(IPC_CHANNELS[method]);

			if (!response.ok) expect(["not-implemented", "invalid-payload", "settings-invalid"]).toContain(response.error.code);
		}
	});
});

describe("payload validation", () =>
{
	const badPayloads: [string, unknown[], RegExp][] = [
		["updateSettings", [{ loopMode: "turbo" }], /argument 1\.loopMode: Invalid option/],
		["updateSettings", [{ hasApiKey: true }], /Unrecognized key.*hasApiKey/],
		["updateSettings", ["not an object"], /expected object/],
		["runQuest", [{ runId: "run-1", questId: "w1-health", files: { "../../Evil.cpp": "" } }], /files\..*Invalid key in record, is not an allowed file name/],
		["runQuest", [{ runId: "run-1", questId: "w1-health", files: { "Folder/Health.cpp": "" } }], /files\..*Invalid key in record, is not an allowed file name/],
		["runQuest", [{ runId: "run 1", questId: "w1-health", files: {} }], /argument 1\.runId: may only hold/],
		["cancelRun", [42], /expected string/],
		["chooseDailyOffer", [3], /<=2/],
		["setApiKey", [""], /Too small/],
		["saveQuestDraft", [{ questId: "q", breakdownPlan: { pieces: [{ id: "a", kind: "god-class", label: "x", purpose: "y" }], edges: [] } }], /breakdownPlan\.pieces\.0\.kind/],
		["submitConcept", [{ questId: "q", prediction: null, answers: [{ kind: "guess" }] }], /answers\.0/],
		["getProgress", ["unexpected extra"], /at most 0 arguments/],
		["getWorld", ["../packs"], /argument 1: may only hold/],
		["getQuest", [7], /expected string/],
		["startDrill", [{ kind: "test-out" }], /worldId/],
		["startDrill", [{ kind: "due", worldId: "objects" }], /Unrecognized key/],
		["startDrill", [{ kind: "cram" }], /kind|Invalid input/],
		["openEditor", [undefined], /expected string/],
	];

	for (const [method, methodArguments, detailPattern] of badPayloads)
	{
		it(`rejects a bad ${method} payload with invalid-payload`, async () =>
		{
			const invoke = createInvoker();
			const channel = IPC_CHANNELS[method as keyof typeof IPC_CHANNELS];
			const error = expectError(await invoke(channel, ...methodArguments), "invalid-payload");

			expect(error.detail).toMatch(detailPattern);
			expect(error.message).not.toMatch(/argument/);
		});
	}

	it("lets a good payload through to the handler", async () =>
	{
		const invoke = createInvoker();

		expect(await invoke(IPC_CHANNELS.runQuest, { runId: "run-1", questId: "w1-health", files: { "DojoHealthComponent.h": "#pragma once" } })).toMatchObject({ ok: true, value: { ok: true, testsPassed: 1 } });
		expect(await invoke(IPC_CHANNELS.updateSettings, { loopMode: "fast", enginePath: null })).toMatchObject({ ok: true, value: { loopMode: "fast", enginePath: null } });
	});

	it("opens the editor through the editor service, with or without a quest id (M1.4b)", async () =>
	{
		const invoke = createInvoker();
		editorOpens.length = 0;

		expect(await invoke(IPC_CHANNELS.openEditor, null)).toEqual({ ok: true });
		expect(await invoke(IPC_CHANNELS.openEditor, "f1-training-dummy")).toEqual({ ok: true });
		expect(editorOpens).toEqual(["open", "open"]);
	});

	it("still answers a reset when the quest run service cannot even be built, as on an unsupported platform (M1.4c)", async () =>
	{
		const { registrar, handlersByChannel } = createFakeRegistrar();
		registerHandlers(registrar, createHandlers({ ...FAKE_DEPENDENCIES, getQuestRunService: () => { throw new AppErrorException("toolchain-missing", "Unreal Dojo works with Unreal on Windows and macOS only.", "Run Unreal Dojo on a Windows PC or a Mac."); } }));

		const handler = handlersByChannel.get(IPC_CHANNELS.resetQuest);
		if (!handler) throw new Error("no resetQuest handler");

		expect((await handler({} as Parameters<WrappedHandler>[0], "f1-training-dummy")).ok).toBe(true);
	});

	it("removes a reset quest's sandbox files after resetting its progress (M1.4b)", async () =>
	{
		const invoke = createInvoker();
		removedQuestFiles.length = 0;

		expect((await invoke(IPC_CHANNELS.resetQuest, "f1-training-dummy")).ok).toBe(true);
		expect(removedQuestFiles).toEqual(["f1-training-dummy"]);
	});

	it("creates the sandbox through the service, streaming progress stamped with the run id", async () =>
	{
		const { registrar, handlersByChannel } = createFakeRegistrar();
		const events: unknown[] = [];
		registerHandlers(registrar, createHandlers({ ...FAKE_DEPENDENCIES, runRegistry: new RunRegistry(), sendProgress: (event) => events.push(event) }));

		const handler = handlersByChannel.get(IPC_CHANNELS.createSandbox);
		const response = await handler?.({} as Parameters<WrappedHandler>[0], { runId: "setup-1", enginePath: "/Engines/UE_5.8", folder: "/Picked" });

		expect(response).toEqual({ ok: true, value: { ok: true, sandboxPath: "/Picked/DojoSandbox", durationMs: 5, compilerOutput: "" } });
		expect(events).toEqual([expect.objectContaining({ runId: "setup-1", phase: "building", percent: 100 })]);
	});

	it("answers pickSandboxFolder with the picked folder and its warnings", async () =>
	{
		const invoke = createInvoker();

		expect(await invoke(IPC_CHANNELS.pickSandboxFolder)).toEqual({ ok: true, value: { path: "/Picked/UE_5.8", warnings: ["long path"] } });
	});

	it("runs a quest under its run id, streaming stamped progress, and checks a snippet", async () =>
	{
		const { registrar, handlersByChannel } = createFakeRegistrar();
		const events: unknown[] = [];
		registerHandlers(registrar, createHandlers({ ...FAKE_DEPENDENCIES, runRegistry: new RunRegistry(), sendProgress: (event) => events.push(event) }));
		const call = (channel: string, ...methodArguments: unknown[]) => handlersByChannel.get(channel)?.({} as Parameters<WrappedHandler>[0], ...methodArguments);

		const run = await call(IPC_CHANNELS.runQuest, { runId: "run-7", questId: "f1-training-dummy", files: { "DojoF1TrainingDummy.h": "#pragma once" } });
		const syntax = await call(IPC_CHANNELS.checkSnippetSyntax, { questId: "c1", code: "oops" });
		const rebuild = await call(IPC_CHANNELS.rebuildSandbox, "rebuild-1");

		expect(run).toMatchObject({ ok: true, value: { ok: true, loop: "headless" } });
		expect(events).toEqual([expect.objectContaining({ runId: "run-7", phase: "writing", lastLine: "Writing 1 file(s) for f1-training-dummy" })]);
		expect(syntax).toEqual({ ok: true, value: { ok: false, diagnostics: [{ line: 1, column: 1, severity: "error", message: "oops" }] } });
		expect(rebuild).toMatchObject({ ok: true, value: { ok: true } });
	});

	it("answers cancelRun for an unknown run with run-not-found", async () =>
	{
		const invoke = createInvoker();

		expectError(await invoke(IPC_CHANNELS.cancelRun, "nothing-running"), "run-not-found");
	});

	it("passes zod's parsed copy to the handler, with strings trimmed", async () =>
	{
		let receivedName = "";

		const definition: HandlerDefinition<"setPlayerName"> = {
			argumentSchemas: [playerNameSchema],
			handle: (playerName) =>
			{
				receivedName = playerName;
				throw new Error("stop here");
			},
		};

		await wrapHandler("setPlayerName", definition)({} as Parameters<WrappedHandler>[0], "  Mohammad  ");
		expect(receivedName).toBe("Mohammad");
	});

	it("never echoes an API key into the error detail", async () =>
	{
		const invoke = createInvoker();
		const error = expectError(await invoke(IPC_CHANNELS.setApiKey, "x".repeat(600)), "invalid-payload");

		expect(error.detail).not.toContain("xxxx");
	});
});

describe("wrapHandler", () =>
{
	const fakeEvent = {} as Parameters<WrappedHandler>[0];

	it("turns a plain thrown Error into an unexpected AppError", async () =>
	{
		const definition: HandlerDefinition<"resetQuest"> = {
			argumentSchemas: [idSchema],
			handle: () =>
			{
				throw new Error("disk on fire");
			},
		};

		const error = expectError(await wrapHandler("resetQuest", definition)(fakeEvent, "w1-health"), "unexpected");

		expect(error.detail).toBe("resetQuest: disk on fire");
		expect(error.suggestedAction.length).toBeGreaterThan(0);
	});

	it("turns a rejected promise into an AppError", async () =>
	{
		const definition: HandlerDefinition<"resetQuest"> = {
			argumentSchemas: [idSchema],
			handle: async () => Promise.reject(new Error("late failure")),
		};

		expectError(await wrapHandler("resetQuest", definition)(fakeEvent, "w1-health"), "unexpected");
	});

	it("passes an AppErrorException through unchanged", async () =>
	{
		const definition: HandlerDefinition<"resetQuest"> = {
			argumentSchemas: [idSchema],
			handle: () =>
			{
				throw new AppErrorException("quest-not-found", "That quest does not exist.", "Go back to the World Map.", "w1-missing");
			},
		};

		const error = expectError(await wrapHandler("resetQuest", definition)(fakeEvent, "w1-missing"), "quest-not-found");

		expect(error).toEqual({ code: "quest-not-found", message: "That quest does not exist.", suggestedAction: "Go back to the World Map.", detail: "w1-missing" });
	});

	it("returns only the four AppError fields, so a function-valued extra property still clones", async () =>
	{
		const definition: HandlerDefinition<"resetQuest"> = {
			argumentSchemas: [idSchema],
			handle: () =>
			{
				throw { code: "save-failed", message: "Saving failed.", suggestedAction: "Try again.", retry: () => "not cloneable" };
			},
		};

		const response = await wrapHandler("resetQuest", definition)(fakeEvent, "w1-health");

		expect(response).toEqual({ ok: false, error: { code: "save-failed", message: "Saving failed.", suggestedAction: "Try again." } });
		expect(() => structuredClone(response)).not.toThrow();
	});

	it("copies an AppErrorException's error instead of returning the exception's own object", async () =>
	{
		const exception = new AppErrorException("save-failed", "Saving failed.", "Try again.");
		Object.assign(exception.appError, { onRetry: () => undefined });

		const definition: HandlerDefinition<"resetQuest"> = {
			argumentSchemas: [idSchema],
			handle: () =>
			{
				throw exception;
			},
		};

		const response = await wrapHandler("resetQuest", definition)(fakeEvent, "w1-health");

		expect(() => structuredClone(response)).not.toThrow();
		expect(response).toEqual({ ok: false, error: { code: "save-failed", message: "Saving failed.", suggestedAction: "Try again." } });
	});

	it("turns a thrown non-Error value into an AppError", async () =>
	{
		const definition: HandlerDefinition<"resetQuest"> = {
			argumentSchemas: [idSchema],
			handle: () =>
			{
				throw "just a string";
			},
		};

		expectError(await wrapHandler("resetQuest", definition)(fakeEvent, "w1-health"), "unexpected");
	});

	it("does not run the handler when the payload is bad", async () =>
	{
		let handlerRan = false;

		const definition: HandlerDefinition<"resetQuest"> = {
			argumentSchemas: [idSchema],
			handle: () =>
			{
				handlerRan = true;
				throw new Error("should not run");
			},
		};

		expectError(await wrapHandler("resetQuest", definition)(fakeEvent, { questId: "w1-health" }), "invalid-payload");
		expect(handlerRan).toBe(false);
	});

	it("needs exactly one schema per argument at compile time", () =>
	{
		// @ts-expect-error resetQuest takes one argument, so it needs one schema.
		const missingCheck: HandlerDefinition<"resetQuest"> = { argumentSchemas: [], handle: () => Promise.reject(new Error("unused")) };

		expect(missingCheck.argumentSchemas).toHaveLength(0);
	});
});
