// The whole quit sequence as main wires it: the save hold, then the Unreal stop, on one fake app whose quit really fires before-quit (M5.1g2, A1460).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { holdQuitForSaves, QUIT_SAVE_WAIT_MS, type SaveQueue } from "../../src/main/lifecycle/holdQuitForSaves";
import type { QuittingApp } from "../../src/main/lifecycle/QuittingApp";
import type { EditorLauncher } from "../../src/main/services/unreal/EditorLauncher";
import { stopEngineWorkBeforeQuit, type CancellableRuns } from "../../src/main/services/unreal/stopEngineWorkBeforeQuit";

/** How long the fake editor takes to close after its exit request. */
const EDITOR_CLOSE_MS = 4000;

/** Fake timers run each deferred quit (`setImmediate`) a millisecond later; a few of them may stack up in one sequence. */
const DEFER_SLACK_MS = 5;

/** A stand-in for Electron's app: every listener sees each before-quit in order, and the app exits when none of them held it. */
function createApp(): { app: QuittingApp; exitedAt: () => number | null }
{
	const listeners: ((event: { preventDefault(): void }) => void)[] = [];
	let exitedAt: number | null = null;

	const app: QuittingApp = {
		on: (_eventName, listener) => void listeners.push(listener),
		quit: () =>
		{
			if (exitedAt !== null) return;

			let held = false;
			for (const listener of listeners) listener({ preventDefault: () => (held = true) });

			if (!held) exitedAt = Date.now();
		},
	};

	return { app, exitedAt: () => exitedAt };
}

/** A save queue like ProgressService's: `save` queues a write that lands after `writeMs`, and `whenIdle` waits for every queued write or the limit. A hung queue never lands. */
function createSaves(writeMs: number, hung = false): SaveQueue & { save: () => void; saved: number; waits: number[] }
{
	let pending: Promise<void> = Promise.resolve();
	let queued = 0;

	const saves = {
		saved: 0,
		waits: [] as number[],
		save: () =>
		{
			queued++;
			pending = pending.then(() => new Promise<void>((resolve) =>
			{
				if (hung) return;

				setTimeout(() =>
				{
					saves.saved++;
					resolve();
				}, writeMs);
			}));
		},
		whenIdle: (timeoutMs: number) =>
		{
			saves.waits.push(timeoutMs);

			if (queued === saves.saved) return Promise.resolve(true);

			const settled = pending.then(() => true);
			const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs));

			return Promise.race([settled, timeout]);
		},
	};

	return saves;
}

/** No runs; an editor that is open and takes `EDITOR_CLOSE_MS` to close once disposed, or none at all. */
function createEngineWork(editorOpen: boolean): { runs: CancellableRuns; editorLauncher: () => EditorLauncher | null }
{
	const launcher = {
		current: () => (editorOpen ? {} : null),
		dispose: () => new Promise<void>((resolve) => setTimeout(resolve, EDITOR_CLOSE_MS)),
	} as unknown as EditorLauncher;

	return { runs: { hasRuns: () => false, cancelAll: async () => undefined }, editorLauncher: () => launcher };
}

describe("the quit sequence: saves, then the Unreal stop", () =>
{
	beforeEach(() =>
	{
		vi.useFakeTimers();
	});

	afterEach(() =>
	{
		vi.useRealTimers();
	});

	it("saves a change made while the editor was closing, before the app exits (A1460)", async () =>
	{
		const { app, exitedAt } = createApp();
		const saves = createSaves(200);
		holdQuitForSaves(app, saves);
		stopEngineWorkBeforeQuit(app, createEngineWork(true));
		const start = Date.now();

		app.quit();

		// The first save wait ends at once; the editor is still closing and the window is open. The learner changes something.
		await vi.advanceTimersByTimeAsync(1000);
		expect(exitedAt()).toBeNull();
		saves.save();

		await vi.advanceTimersByTimeAsync(EDITOR_CLOSE_MS + QUIT_SAVE_WAIT_MS);

		expect(saves.saved).toBe(1);
		expect(exitedAt()).not.toBeNull();
		expect((exitedAt() ?? 0) - start).toBeLessThanOrEqual(EDITOR_CLOSE_MS + 200 + DEFER_SLACK_MS);
		expect(saves.waits.length).toBeGreaterThanOrEqual(2);
	});

	it("does not slow a quit with nothing pending and no editor: it exits on the next turn", async () =>
	{
		const { app, exitedAt } = createApp();
		const saves = createSaves(200);
		holdQuitForSaves(app, saves);
		stopEngineWorkBeforeQuit(app, createEngineWork(false));
		const start = Date.now();

		app.quit();
		await vi.advanceTimersByTimeAsync(DEFER_SLACK_MS);

		expect((exitedAt() ?? Infinity) - start).toBeLessThanOrEqual(DEFER_SLACK_MS);
		expect(saves.waits).toEqual([QUIT_SAVE_WAIT_MS]);
	});

	it("waits for a save already queued when quit starts, then exits", async () =>
	{
		const { app, exitedAt } = createApp();
		const saves = createSaves(500);
		holdQuitForSaves(app, saves);
		stopEngineWorkBeforeQuit(app, createEngineWork(false));
		const start = Date.now();

		saves.save();
		app.quit();
		await vi.advanceTimersByTimeAsync(499);
		expect(exitedAt()).toBeNull();

		await vi.advanceTimersByTimeAsync(1 + DEFER_SLACK_MS);

		expect(saves.saved).toBe(1);
		expect((exitedAt() ?? Infinity) - start).toBeLessThanOrEqual(500 + DEFER_SLACK_MS);
	});

	it("still exits within a bound when a save hangs, with or without the editor (A1211, A1460)", async () =>
	{
		for (const editorOpen of [false, true])
		{
			const { app, exitedAt } = createApp();
			const saves = createSaves(200, true);
			holdQuitForSaves(app, saves);
			stopEngineWorkBeforeQuit(app, createEngineWork(editorOpen));
			const start = Date.now();

			saves.save();
			app.quit();

			// At most the Unreal stop plus one more save wait after it; the first wait runs alongside the stop.
			const bound = Math.max(QUIT_SAVE_WAIT_MS, editorOpen ? EDITOR_CLOSE_MS : 0) + QUIT_SAVE_WAIT_MS;
			await vi.advanceTimersByTimeAsync(bound + DEFER_SLACK_MS);

			expect(exitedAt(), `editor open: ${editorOpen}`).not.toBeNull();
			expect((exitedAt() ?? 0) - start, `editor open: ${editorOpen}`).toBeLessThanOrEqual(bound + DEFER_SLACK_MS);
		}
	});

	it("adds no extra wait when the learner presses quit again while the editor closes", async () =>
	{
		const { app, exitedAt } = createApp();
		const saves = createSaves(200);
		holdQuitForSaves(app, saves);
		stopEngineWorkBeforeQuit(app, createEngineWork(true));
		const start = Date.now();

		app.quit();
		await vi.advanceTimersByTimeAsync(1000);
		app.quit();
		app.quit();
		await vi.advanceTimersByTimeAsync(EDITOR_CLOSE_MS + DEFER_SLACK_MS);

		expect((exitedAt() ?? Infinity) - start).toBeLessThanOrEqual(EDITOR_CLOSE_MS + DEFER_SLACK_MS);
	});
});
