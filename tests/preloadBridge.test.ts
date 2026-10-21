// Checks the preload bridge with a mocked electron: what window.dojo exposes, how answers are unwrapped, and the progress subscription.
import type { EventEmitter } from "node:events";

import { beforeAll, describe, expect, it, vi } from "vitest";

import { BUILD_PROGRESS_CHANNEL, DOJO_METHODS, IPC_CHANNELS, type DojoApi } from "@shared/ipc";
import type { BuildProgressEvent } from "@shared/types/run";

/** The fake electron the preload sees: an exposeInMainWorld that records, and an ipcRenderer with a scripted invoke and a real event emitter. */
const fakeElectron = vi.hoisted(() =>
{
	const exposed = new Map<string, unknown>();
	const invokeAnswers = new Map<string, () => Promise<unknown>>();
	const invokeCalls: { channel: string; methodArguments: unknown[] }[] = [];

	return { exposed, invokeAnswers, invokeCalls, emitter: null as EventEmitter | null };
});

vi.mock("electron", async () =>
{
	const { EventEmitter: Emitter } = await import("node:events");
	const emitter = new Emitter();
	fakeElectron.emitter = emitter;

	return {
		contextBridge: { exposeInMainWorld: (key: string, api: unknown) => fakeElectron.exposed.set(key, api) },
		ipcRenderer: {
			invoke: (channel: string, ...methodArguments: unknown[]) =>
			{
				fakeElectron.invokeCalls.push({ channel, methodArguments });

				const answer = fakeElectron.invokeAnswers.get(channel);
				return answer ? answer() : Promise.reject(new Error(`No handler registered for '${channel}'`));
			},
			on: (channel: string, listener: (...listenerArguments: unknown[]) => void) => emitter.on(channel, listener),
			removeListener: (channel: string, listener: (...listenerArguments: unknown[]) => void) => emitter.removeListener(channel, listener),
		},
	};
});

let dojo: DojoApi;

beforeAll(async () =>
{
	await import("../src/preload/index");
	dojo = fakeElectron.exposed.get("dojo") as DojoApi;
});

/** Sends one progress event the way main's webContents.send would arrive in the preload. */
function emitProgress(progressEvent: BuildProgressEvent): void
{
	fakeElectron.emitter?.emit(BUILD_PROGRESS_CHANNEL, {}, progressEvent);
}

describe("preload bridge", () =>
{
	it("exposes only window.dojo, with exactly the DojoApi methods", () =>
	{
		expect([...fakeElectron.exposed.keys()]).toEqual(["dojo"]);
		expect(Object.keys(dojo).sort()).toEqual([...DOJO_METHODS, "onBuildProgress"].sort());

		for (const value of Object.values(dojo)) expect(typeof value).toBe("function");
	});

	it("forwards a call to its channel with its arguments and resolves with the value", async () =>
	{
		fakeElectron.invokeAnswers.set(IPC_CHANNELS.resetQuest, async () => ({ ok: true, value: { status: "available" } }));

		await expect(dojo.resetQuest("w1-health")).resolves.toEqual({ status: "available" });
		expect(fakeElectron.invokeCalls.at(-1)).toEqual({ channel: IPC_CHANNELS.resetQuest, methodArguments: ["w1-health"] });
	});

	it("rejects with the plain AppError when main answers an error", async () =>
	{
		const error = { code: "not-implemented", message: "Not built yet.", suggestedAction: "Wait." };
		fakeElectron.invokeAnswers.set(IPC_CHANNELS.getSettings, async () => ({ ok: false, error }));

		await expect(dojo.getSettings()).rejects.toEqual(error);
	});

	it("rejects with ipc-failed when the call never reaches a handler", async () =>
	{
		await expect(dojo.getRules()).rejects.toMatchObject({ code: "ipc-failed" });
	});

	it("delivers progress events until unsubscribed, and unsubscribing twice is safe", () =>
	{
		const received: BuildProgressEvent[] = [];
		const unsubscribe = dojo.onBuildProgress((progressEvent) => received.push(progressEvent));
		const first: BuildProgressEvent = { runId: "run-1", phase: "building", elapsedMs: 10, lastLine: "Compiling" };

		emitProgress(first);
		expect(received).toEqual([first]);

		unsubscribe();
		expect(() => unsubscribe()).not.toThrow();

		emitProgress({ runId: "run-1", phase: "testing", elapsedMs: 20, lastLine: "Testing" });
		expect(received).toEqual([first]);
		expect(fakeElectron.emitter?.listenerCount(BUILD_PROGRESS_CHANNEL)).toBe(0);
	});

	it("keeps other subscribers when one unsubscribes twice", () =>
	{
		const firstReceived: BuildProgressEvent[] = [];
		const secondReceived: BuildProgressEvent[] = [];
		const unsubscribeFirst = dojo.onBuildProgress((progressEvent) => firstReceived.push(progressEvent));
		const unsubscribeSecond = dojo.onBuildProgress((progressEvent) => secondReceived.push(progressEvent));

		unsubscribeFirst();
		unsubscribeFirst();
		emitProgress({ runId: "run-2", phase: "parsing", elapsedMs: 5, lastLine: "" });

		expect(firstReceived).toHaveLength(0);
		expect(secondReceived).toHaveLength(1);

		unsubscribeSecond();
	});
});
