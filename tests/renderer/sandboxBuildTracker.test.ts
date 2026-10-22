// The first-run build never freezes: an answer that lands before any event, dropped events, a lost answer, and a forgotten run all reach an end (A822).
import { describe, expect, it } from "vitest";

import type { SandboxSetupResult } from "@shared/types/engine";
import type { BuildProgressEvent, RunStatus } from "@shared/types/run";

import { QUIET_AFTER_MS, SandboxBuildTracker, type SandboxBuildSnapshot, type TrackerClient, type TrackerClock } from "../../src/renderer/src/data/SandboxBuildTracker";

/** A clock moved by hand; `advance` runs the interval callbacks for each whole second that passes. */
class ManualClock implements TrackerClock
{
	time = 1_000_000;
	private readonly callbacks = new Set<() => void>();

	now(): number
	{
		return this.time;
	}

	every(callback: () => void): () => void
	{
		this.callbacks.add(callback);

		return () => this.callbacks.delete(callback);
	}

	/** Moves time forward second by second, ticking every interval. */
	async advance(milliseconds: number): Promise<void>
	{
		for (let passed = 0; passed < milliseconds; passed += 1_000)
		{
			this.time += 1_000;

			for (const callback of [...this.callbacks]) callback();

			await flush();
		}
	}
}

/** Lets pending promise callbacks run. */
function flush(): Promise<void>
{
	return new Promise((resolve) => setTimeout(resolve, 0));
}

/** A fake main process: records the listener, answers status checks from a value the test sets, and can emit events. */
class FakeMain implements TrackerClient
{
	listener: ((event: BuildProgressEvent) => void) | null = null;
	status: RunStatus | null = null;
	statusCalls = 0;
	subscribedBeforeCall = false;

	onBuildProgress(listener: (event: BuildProgressEvent) => void): () => void
	{
		this.listener = listener;

		return () =>
		{
			if (this.listener === listener) this.listener = null;
		};
	}

	getRunStatus(runId: string): Promise<RunStatus>
	{
		this.statusCalls += 1;

		return Promise.resolve(this.status ?? { runId, state: "running", lastEvent: null, answer: null });
	}

	cancelRun(): Promise<void>
	{
		return Promise.resolve();
	}

	/** Sends one progress event to the window. */
	emit(event: BuildProgressEvent): void
	{
		this.listener?.(event);
	}
}

const RUN_ID = "run-1";
const PASSED: SandboxSetupResult = { ok: true, sandboxPath: "/sandbox/DojoSandbox", durationMs: 25_000, compilerOutput: "" };

/** An event for the test's run. */
function event(lastLine: string, elapsedMs = 0): BuildProgressEvent
{
	return { runId: RUN_ID, phase: "building", elapsedMs, lastLine };
}

/** Builds a tracker over the fake main and records every snapshot. */
function track(main: FakeMain, clock: ManualClock, operation: (runId: string) => Promise<SandboxSetupResult>): { tracker: SandboxBuildTracker; snapshots: SandboxBuildSnapshot[] }
{
	const snapshots: SandboxBuildSnapshot[] = [];
	const tracker = new SandboxBuildTracker(main, operation, (snapshot) => snapshots.push(snapshot), clock, () => RUN_ID);

	return { tracker, snapshots };
}

describe("SandboxBuildTracker", () =>
{
	it("listens before the call goes out, so events sent while it starts and an immediate answer both count", async () =>
	{
		const main = new FakeMain();
		const clock = new ManualClock();
		const { tracker } = track(main, clock, (runId) =>
		{
			main.subscribedBeforeCall = main.listener !== null;
			main.emit({ ...event("Copying the sandbox template"), runId });

			return Promise.resolve(PASSED);
		});

		tracker.start();
		await flush();

		expect(main.subscribedBeforeCall).toBe(true);
		expect(tracker.current().status).toBe("succeeded");
		expect(tracker.current().progress?.lastLine).toBe("Copying the sandbox template");
		expect(main.listener).toBeNull();
	});

	it("keeps its clock moving with no events, then asks main and finishes when the answer was lost (the tester's hang)", async () =>
	{
		const main = new FakeMain();
		const clock = new ManualClock();
		const { tracker } = track(main, clock, () => new Promise<SandboxSetupResult>(() => undefined));

		tracker.start();
		main.emit(event("Starting the first full build"));
		await clock.advance(5_000);

		expect(tracker.current()).toMatchObject({ status: "running", elapsedMs: 5_000, isQuiet: false });
		expect(main.statusCalls).toBe(0);

		main.status = { runId: RUN_ID, state: "finished", lastEvent: event("Result: Succeeded", 25_000), answer: { ok: true, value: PASSED } };
		await clock.advance(QUIET_AFTER_MS);

		expect(main.statusCalls).toBeGreaterThan(0);
		expect(tracker.current()).toMatchObject({ status: "succeeded", result: PASSED, isQuiet: false });
		expect(tracker.current().progress?.lastLine).toBe("Result: Succeeded");
	});

	it("marks a silent build quiet, and a status answer that it is still running brings back the missed progress", async () =>
	{
		const main = new FakeMain();
		const clock = new ManualClock();
		const { tracker } = track(main, clock, () => new Promise<SandboxSetupResult>(() => undefined));

		tracker.start();
		main.status = { runId: RUN_ID, state: "running", lastEvent: event("[300/418] Compile DojoTestActor.cpp", 40_000), answer: null };
		await clock.advance(QUIET_AFTER_MS - 1_000);

		expect(tracker.current().isQuiet).toBe(false);

		await clock.advance(1_000);

		expect(main.statusCalls).toBe(1);
		expect(tracker.current()).toMatchObject({ status: "running", isQuiet: false });
		expect(tracker.current().progress?.lastLine).toBe("[300/418] Compile DojoTestActor.cpp");
	});

	it("ends with a plain error when main no longer knows the run", async () =>
	{
		const main = new FakeMain();
		const clock = new ManualClock();
		const { tracker } = track(main, clock, () => new Promise<SandboxSetupResult>(() => undefined));

		tracker.start();
		main.status = { runId: RUN_ID, state: "unknown", lastEvent: null, answer: null };
		await clock.advance(QUIET_AFTER_MS);

		expect(tracker.current().status).toBe("errored");
		expect(tracker.current().error?.code).toBe("run-not-found");
	});

	it("applies the answer once: a late call answer after a status check changes nothing, and other runs' events are ignored", async () =>
	{
		const main = new FakeMain();
		const clock = new ManualClock();
		let answerLate: (value: SandboxSetupResult) => void = () => undefined;
		const { tracker, snapshots } = track(main, clock, () => new Promise<SandboxSetupResult>((resolve) => (answerLate = resolve)));

		tracker.start();
		main.emit({ ...event("someone else's build"), runId: "run-2" });

		expect(tracker.current().progress).toBeNull();

		main.status = { runId: RUN_ID, state: "finished", lastEvent: null, answer: { ok: true, value: PASSED } };
		await tracker.checkStatus();
		const count = snapshots.length;

		answerLate({ ...PASSED, ok: false, compilerOutput: "should be ignored" });
		await flush();

		expect(snapshots.length).toBe(count);
		expect(tracker.current().status).toBe("succeeded");
	});

	it("reports a cancel from a status check as cancelled, not as an error", async () =>
	{
		const main = new FakeMain();
		const clock = new ManualClock();
		const { tracker } = track(main, clock, () => new Promise<SandboxSetupResult>(() => undefined));

		tracker.start();
		main.status = { runId: RUN_ID, state: "finished", lastEvent: null, answer: { ok: false, error: { code: "run-cancelled", message: "Cancelled.", suggestedAction: "Start again." } } };
		await tracker.checkStatus();

		expect(tracker.current().status).toBe("cancelled");
	});
});
