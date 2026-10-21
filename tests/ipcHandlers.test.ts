// Checks the IPC boundary: every channel has a handler, bad payloads and thrown errors come back as AppErrors, and main never throws.
import { describe, expect, it } from "vitest";

import { DOJO_METHODS, IPC_CHANNELS, type IpcResponse } from "@shared/ipc";
import { isAppError } from "@shared/types/errors";

import { AppErrorException } from "../src/main/errors/AppErrorException";
import { createHandlers } from "../src/main/ipc/createHandlers";
import type { HandlerDefinition } from "../src/main/ipc/HandlerDefinition";
import { idSchema, playerNameSchema } from "../src/main/ipc/requestSchemas";
import { registerHandlers, wrapHandler, type IpcHandleRegistrar, type WrappedHandler } from "../src/main/ipc/registerHandlers";

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
	registerHandlers(registrar, createHandlers({ getAppVersion: () => "9.9.9" }));

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
		registerHandlers(registrar, createHandlers({ getAppVersion: () => "9.9.9" }));

		expect([...handlersByChannel.keys()].sort()).toEqual(Object.values(IPC_CHANNELS).sort());
	});

	it("answers getAppVersion with the injected version", async () =>
	{
		const invoke = createInvoker();

		expect(await invoke(IPC_CHANNELS.getAppVersion)).toEqual({ ok: true, value: "9.9.9" });
	});

	it("answers a stub with a not-implemented AppError that names when it arrives", async () =>
	{
		const invoke = createInvoker();
		const error = expectError(await invoke(IPC_CHANNELS.getSettings), "not-implemented");

		expect(error.suggestedAction).toMatch(/arrives with/);
	});

	it("answers every channel with an IpcResponse, never a throw, even with no arguments", async () =>
	{
		const invoke = createInvoker();

		for (const method of DOJO_METHODS)
		{
			const response = await invoke(IPC_CHANNELS[method]);

			if (!response.ok) expect(["not-implemented", "invalid-payload"]).toContain(response.error.code);
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

		expectError(await invoke(IPC_CHANNELS.runQuest, { runId: "run-1", questId: "w1-health", files: { "DojoHealthComponent.h": "#pragma once" } }), "not-implemented");
		expectError(await invoke(IPC_CHANNELS.openEditor, null), "not-implemented");
		expectError(await invoke(IPC_CHANNELS.updateSettings, { loopMode: "fast", enginePath: null }), "not-implemented");
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
