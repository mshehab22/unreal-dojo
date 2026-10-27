// Checks that quitting waits for pending saves, for at most the limit, and holds only once.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { holdQuitForSaves, QUIT_SAVE_WAIT_MS, type Defer, type SaveQueue } from "../../src/main/lifecycle/holdQuitForSaves";
import type { QuittingApp } from "../../src/main/lifecycle/QuittingApp";

/** A stand-in for Electron's app that records quits and replays before-quit; `fire` answers whether the quit was held. */
function createApp(): { app: QuittingApp & { quitCount: number }; fire: () => boolean }
{
	let listener: (event: { preventDefault(): void }) => void = () => undefined;
	const app = { quitCount: 0, on: (_eventName: "before-quit", newListener: typeof listener) => (listener = newListener), quit: () => app.quitCount++ };
	const fire = (): boolean =>
	{
		let prevented = false;
		listener({ preventDefault: () => (prevented = true) });

		return prevented;
	};

	return { app: app as QuittingApp & { quitCount: number }, fire };
}

/** A save queue that stays busy until `finish` is called, or until the wait given to it runs out, like the real one. */
function createBusySaves(): { saves: SaveQueue & { waits: number[] }; finish: () => void }
{
	let finish: () => void = () => undefined;
	const saves = {
		waits: [] as number[],
		whenIdle: (timeoutMs: number) =>
		{
			saves.waits.push(timeoutMs);

			return new Promise<boolean>((resolve) =>
			{
				finish = () => resolve(true);
				setTimeout(() => resolve(false), timeoutMs);
			});
		},
	};

	return { saves, finish: () => finish() };
}

/** A deferral the test runs by hand with `runLater`, so the later turn is under its control. */
function createDeferrer(): { defer: Defer; runLater: () => void }
{
	const waiting: (() => void)[] = [];

	return { defer: (action) => void waiting.push(action), runLater: () => waiting.splice(0).forEach((action) => action()) };
}

describe("holdQuitForSaves", () =>
{
	beforeEach(() =>
	{
		vi.useFakeTimers();
	});

	afterEach(() =>
	{
		vi.useRealTimers();
	});

	it("holds the quit until the pending save is written, then quits once", async () =>
	{
		const { app, fire } = createApp();
		const { saves, finish } = createBusySaves();
		const { defer, runLater } = createDeferrer();
		holdQuitForSaves(app, saves, QUIT_SAVE_WAIT_MS, defer);

		expect(fire()).toBe(true);
		expect(app.quitCount).toBe(0);

		finish();
		await vi.advanceTimersByTimeAsync(0);
		runLater();

		expect(app.quitCount).toBe(1);
		expect(fire()).toBe(false);
	});

	it("does not quit inside the turn that saw the saves finish, even when nothing was pending", async () =>
	{
		const { app, fire } = createApp();
		const { defer, runLater } = createDeferrer();
		holdQuitForSaves(app, { whenIdle: async () => true }, QUIT_SAVE_WAIT_MS, defer);

		expect(fire()).toBe(true);
		await vi.advanceTimersByTimeAsync(0);

		expect(app.quitCount).toBe(0);

		runLater();

		expect(app.quitCount).toBe(1);
	});

	it("waits at most the limit when a save never finishes", async () =>
	{
		const { app, fire } = createApp();
		const { saves } = createBusySaves();
		const { defer, runLater } = createDeferrer();
		holdQuitForSaves(app, saves, QUIT_SAVE_WAIT_MS, defer);

		fire();
		await vi.advanceTimersByTimeAsync(QUIT_SAVE_WAIT_MS - 1);
		runLater();
		expect(app.quitCount).toBe(0);

		await vi.advanceTimersByTimeAsync(1);
		runLater();

		expect(saves.waits).toEqual([3000]);
		expect(app.quitCount).toBe(1);
	});

	it("holds only once: further quit attempts while waiting add no second wait or quit", async () =>
	{
		const { app, fire } = createApp();
		const { saves, finish } = createBusySaves();
		const { defer, runLater } = createDeferrer();
		holdQuitForSaves(app, saves, QUIT_SAVE_WAIT_MS, defer);

		expect(fire()).toBe(true);
		expect(fire()).toBe(true);
		expect(saves.waits).toHaveLength(1);

		finish();
		await vi.advanceTimersByTimeAsync(0);
		runLater();

		expect(app.quitCount).toBe(1);
		expect(fire()).toBe(false);
		expect(saves.waits).toHaveLength(1);
	});

	it("quits when the save queue itself fails", async () =>
	{
		const { app, fire } = createApp();
		const { defer, runLater } = createDeferrer();
		holdQuitForSaves(app, { whenIdle: () => Promise.reject(new Error("disk gone")) }, QUIT_SAVE_WAIT_MS, defer);

		fire();
		await vi.advanceTimersByTimeAsync(0);
		runLater();

		expect(app.quitCount).toBe(1);
	});

	it("uses the wait it is given", async () =>
	{
		const { app, fire } = createApp();
		const { saves } = createBusySaves();
		const { defer, runLater } = createDeferrer();
		holdQuitForSaves(app, saves, 500, defer);

		fire();
		await vi.advanceTimersByTimeAsync(500);
		runLater();

		expect(saves.waits).toEqual([500]);
		expect(app.quitCount).toBe(1);
	});

	it("defers with setImmediate when no deferral is given", async () =>
	{
		const { app, fire } = createApp();
		holdQuitForSaves(app, { whenIdle: async () => true });

		fire();

		// Only promise callbacks run here (no timers), so the deferred quit has not happened yet.
		for (let turn = 0; turn < 10; turn++) await Promise.resolve();

		expect(app.quitCount).toBe(0);

		await vi.advanceTimersByTimeAsync(0);

		expect(app.quitCount).toBe(1);
	});
});
