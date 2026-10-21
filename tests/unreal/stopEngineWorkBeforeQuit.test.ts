// Checks the one quit sequence: runs cancelled, then the editor closed, quit held meanwhile, and no editor started once quit began (A530).
import { describe, expect, it } from "vitest";

import { CLOSE_GRACE_MS, EditorLauncher } from "../../src/main/services/unreal/EditorLauncher";
import { MacPlatformPaths } from "../../src/main/services/unreal/MacPlatformPaths";
import { QUIT_RUN_WAIT_MS, stopEngineWorkBeforeQuit, type CancellableRuns, type QuittingApp } from "../../src/main/services/unreal/stopEngineWorkBeforeQuit";
import { FakeEditorToolClient } from "./FakeEditorToolClient";
import { FakeProcessLauncher } from "./FakeProcessLauncher";
import { FakeTimer } from "./FakeTimer";

const ENGINE = "/Users/learner/Applications/UE_5.8";
const PROJECT = "/Users/learner/Dojo/DojoSandbox/Dojo.uproject";

/** A stand-in for Electron's app that records quits and replays before-quit; `fire` answers whether the quit was held. */
function createApp()
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

/** Runs that record the order of events and finish cancelling when `finish` is called. */
function createRuns(order: string[])
{
	let active = false;
	let finish: () => void = () => undefined;
	const runs: CancellableRuns & { start(): void; finish(): void; waits: number[] } = {
		waits: [],
		start: () => (active = true),
		finish: () => finish(),
		hasRuns: () => active,
		cancelAll: (waitMs) =>
		{
			runs.waits.push(waitMs);
			order.push("cancel runs");

			return new Promise<void>((resolve) => (finish = () =>
			{
				active = false;
				resolve();
			}));
		},
	};

	return runs;
}

/** An editor launcher over a fake editor that ignores the exit request until killed. */
function createLauncher(order: string[])
{
	const processes = new FakeProcessLauncher([{ hangs: true }, { hangs: true }]);
	processes.honorsExitRequests = false;
	const timer = new FakeTimer();
	const launcher = new EditorLauncher({ paths: new MacPlatformPaths("/Users/learner"), launcher: processes, timer, portProbe: { isInUse: async () => false }, createClient: () =>
	{
		const client = new FakeEditorToolClient();
		client.close = async () => void order.push("close editor");

		return client;
	} });

	return { launcher, processes, timer };
}

/** Lets pending promise callbacks run. */
async function settle(): Promise<void>
{
	for (let step = 0; step < 10; step++) await Promise.resolve();
}

describe("stopEngineWorkBeforeQuit", () =>
{
	it("cancels runs first, then closes the editor (killing it after the grace), holding every quit attempt until both are done", async () =>
	{
		const order: string[] = [];
		const runs = createRuns(order);
		const { launcher, processes, timer } = createLauncher(order);
		await launcher.launch({ engineRoot: ENGINE, projectFile: PROJECT, port: 8000, startMcpServer: true, windowless: false });
		runs.start();
		const { app, fire } = createApp();
		stopEngineWorkBeforeQuit(app, { runs, editorLauncher: () => launcher });

		expect(fire()).toBe(true);
		await settle();
		expect(order).toEqual(["cancel runs"]);
		expect(runs.waits).toEqual([QUIT_RUN_WAIT_MS]);
		expect(fire()).toBe(true);

		runs.finish();
		await settle();
		expect(order).toEqual(["cancel runs", "close editor"]);
		expect(app.quitCount).toBe(0);

		timer.advance(CLOSE_GRACE_MS);
		await settle();

		expect(processes.killCount).toBe(1);
		expect(app.quitCount).toBe(1);
		expect(fire()).toBe(false);
	});

	it("closes an open editor when no run is going", async () =>
	{
		const order: string[] = [];
		const { launcher, timer } = createLauncher(order);
		await launcher.launch({ engineRoot: ENGINE, projectFile: PROJECT, port: 8000, startMcpServer: true, windowless: false });
		const { app, fire } = createApp();
		stopEngineWorkBeforeQuit(app, { runs: createRuns(order), editorLauncher: () => launcher });

		expect(fire()).toBe(true);
		timer.advance(CLOSE_GRACE_MS);
		await settle();

		expect(order[0]).toBe("close editor");
		expect(order).not.toContain("cancel runs");
		expect(app.quitCount).toBe(1);
	});

	it("lets the quit through when nothing is running, and still stops a later reopen", async () =>
	{
		const order: string[] = [];
		const { launcher } = createLauncher(order);
		const { app, fire } = createApp();
		stopEngineWorkBeforeQuit(app, { runs: createRuns(order), editorLauncher: () => launcher });

		expect(fire()).toBe(false);
		await settle();
		expect(await launcher.reopen()).toBeNull();
	});

	it("lets the quit through when the Unreal services were never built", () =>
	{
		const { app, fire } = createApp();
		stopEngineWorkBeforeQuit(app, { runs: createRuns([]), editorLauncher: () => null });

		expect(fire()).toBe(false);
	});
});
