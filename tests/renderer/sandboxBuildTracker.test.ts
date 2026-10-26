// The first-run build never freezes: an answer before any event, a lost answer, a silent but alive build, a status check that never
// answers, a forgotten run, and duplicate answers all end in a clear state (A822).
import { describe, expect, it } from "vitest";

import type { SandboxSetupResult } from "@shared/types/engine";
import type { BuildProgressEvent, RunStatus } from "@shared/types/run";

import {
	FAILED_CHECKS_BEFORE_UNREACHABLE,
	QUIET_AFTER_MS,
	SandboxBuildTracker,
	STATUS_TIMEOUT_MS,
	type SandboxBuildSnapshot,
	type TrackerClient,
	type TrackerClock,
} from "../../src/renderer/src/data/SandboxBuildTracker";

/** A clock moved by hand; `advance` steps one second at a time, running intervals and due one-shot timers. */
class ManualClock implements TrackerClock
{
	time = 1_000_000;
	private readonly intervals = new Set<() => void>();
	private readonly timers = new Set<{ at: number; callback: () => void }>();

	now(): number
	{
		return this.time;
	}

	every(callback: () => void): () => void
	{
		this.intervals.add(callback);

		return () => this.intervals.delete(callback);
	}

	after(callback: () => void, delayMs: number): () => void
	{
		const timer = { at: this.time + delayMs, callback };
		this.timers.add(timer);

		return () => this.timers.delete(timer);
	}

	/** Moves time forward second by second, firing due timers and ticking every interval. Returns every snapshot's quiet flag per second. */
	async advance(milliseconds: number, probe?: () => void): Promise<void>
	{
		for (let passed = 0; passed < milliseconds; passed += 1_000)
		{
			this.time += 1_000;

			for (const timer of [...this.timers])
			{
				if (timer.at > this.time) continue;

				this.timers.delete(timer);
				timer.callback();
			}

			for (const callback of [...this.intervals]) callback();

			await flush();
			probe?.();
		}
	}
}

/** Lets pending promise callbacks run. */
function flush(): Promise<void>
{
	return new Promise((resolve) => setTimeout(resolve, 0));
}

/** A fake main process: records the listener, answers status checks from what the test sets (or never), and can emit events. */
class FakeMain implements TrackerClient
{
	listener: ((event: BuildProgressEvent) => void) | null = null;
	status: RunStatus | null = null;
	statusNeverAnswers = false;
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

		if (this.statusNeverAnswers) return new Promise<RunStatus>(() => undefined);

		return Promise.resolve(this.status ?? { runId, state: "running", lastEvent: null, eventCount: 0, answer: null });
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
const FAILED: SandboxSetupResult = { ok: false, sandboxPath: "/sandbox/DojoSandbox", durationMs: 31_000, compilerOutput: "error C2065" };

/** An event for the test's run. */
function event(lastLine: string, elapsedMs = 0): BuildProgressEvent
{
	return { runId: RUN_ID, phase: "building", elapsedMs, lastLine };
}

/** A call that never answers, as in the tester's hang. */
function neverAnswers(): Promise<SandboxSetupResult>
{
	return new Promise<SandboxSetupResult>(() => undefined);
}

/** Builds a first-run tracker over the fake main and records every snapshot. */
function track(main: FakeMain, clock: ManualClock, operation: (runId: string) => Promise<SandboxSetupResult>): { tracker: SandboxBuildTracker; snapshots: SandboxBuildSnapshot[] }
{
	const snapshots: SandboxBuildSnapshot[] = [];
	const tracker = new SandboxBuildTracker(main, operation, (snapshot) => snapshots.push(snapshot), "first-run", clock, () => RUN_ID);

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

	it("keeps its clock moving with no events, then finishes through a status check when the answer was lost", async () =>
	{
		const main = new FakeMain();
		const clock = new ManualClock();
		const { tracker } = track(main, clock, neverAnswers);

		tracker.start();
		main.emit(event("Starting the first full build"));
		await clock.advance(5_000);

		expect(tracker.current()).toMatchObject({ status: "running", elapsedMs: 5_000, isQuiet: false });
		expect(main.statusCalls).toBe(0);

		main.status = { runId: RUN_ID, state: "finished", lastEvent: event("Result: Succeeded", 25_000), eventCount: 9, answer: { ok: true, value: PASSED } };
		await clock.advance(QUIET_AFTER_MS);

		expect(main.statusCalls).toBeGreaterThan(0);
		expect(tracker.current()).toMatchObject({ status: "succeeded", result: PASSED, isQuiet: false });
		expect(tracker.current().progress?.lastLine).toBe("Result: Succeeded");
	});

	it("a finished but failed build recovered through status reaches the failed view", async () =>
	{
		const main = new FakeMain();
		const clock = new ManualClock();
		const { tracker } = track(main, clock, neverAnswers);

		tracker.start();
		main.status = { runId: RUN_ID, state: "finished", lastEvent: null, eventCount: 4, answer: { ok: true, value: FAILED } };
		await clock.advance(QUIET_AFTER_MS);

		expect(tracker.current()).toMatchObject({ status: "failed", result: FAILED });
	});

	it("stays quiet while main says running with no new events: the notice holds at every second for a minute", async () =>
	{
		const main = new FakeMain();
		const clock = new ManualClock();
		const { tracker } = track(main, clock, neverAnswers);
		const quietBySecond: boolean[] = [];

		tracker.start();
		main.emit(event("Starting the first full build"));
		main.status = { runId: RUN_ID, state: "running", lastEvent: event("Starting the first full build"), eventCount: 1, answer: null };

		await clock.advance(QUIET_AFTER_MS);
		await clock.advance(60_000, () => quietBySecond.push(tracker.current().isQuiet));

		expect(main.statusCalls).toBeGreaterThanOrEqual(4);
		expect(quietBySecond).toHaveLength(60);
		expect(quietBySecond.every(Boolean)).toBe(true);
		expect(tracker.current()).toMatchObject({ status: "running", isQuiet: true, isConfirmedRunning: true });
		expect(tracker.current().silentForMs).toBe(75_000);
	});

	it("a running status carrying events the window missed counts as new output and brings that progress back", async () =>
	{
		const main = new FakeMain();
		const clock = new ManualClock();
		const { tracker } = track(main, clock, neverAnswers);

		tracker.start();
		main.emit(event("Starting the first full build"));
		main.status = { runId: RUN_ID, state: "running", lastEvent: event("[300/418] Compile DojoTestActor.cpp", 40_000), eventCount: 7, answer: null };
		await clock.advance(QUIET_AFTER_MS);

		expect(main.statusCalls).toBe(1);
		expect(tracker.current()).toMatchObject({ status: "running", isQuiet: false, isConfirmedRunning: false });
		expect(tracker.current().progress?.lastLine).toBe("[300/418] Compile DojoTestActor.cpp");
	});

	it("a status check that never answers times out, frees the button, retries, and after a few says main is unreachable", async () =>
	{
		const main = new FakeMain();
		const clock = new ManualClock();
		const { tracker } = track(main, clock, neverAnswers);

		tracker.start();
		main.statusNeverAnswers = true;
		await clock.advance(QUIET_AFTER_MS);

		expect(tracker.current().isChecking).toBe(true);

		await clock.advance(STATUS_TIMEOUT_MS);

		expect(tracker.current()).toMatchObject({ isChecking: false, isUnreachable: false, status: "running" });

		await clock.advance(30_000 * FAILED_CHECKS_BEFORE_UNREACHABLE);

		expect(main.statusCalls).toBeGreaterThanOrEqual(FAILED_CHECKS_BEFORE_UNREACHABLE);
		expect(tracker.current()).toMatchObject({ isUnreachable: true, status: "running" });

		// Main answers again: the warning clears.
		main.statusNeverAnswers = false;
		main.status = { runId: RUN_ID, state: "running", lastEvent: null, eventCount: 0, answer: null };
		await clock.advance(30_000);

		expect(tracker.current().isUnreachable).toBe(false);
	});

	it("a progress event clears earlier failed checks, so the next quiet stretch starts from a clean slate", async () =>
	{
		const main = new FakeMain();
		const clock = new ManualClock();
		const { tracker } = track(main, clock, neverAnswers);

		tracker.start();
		main.statusNeverAnswers = true;
		await clock.advance(30_000 * FAILED_CHECKS_BEFORE_UNREACHABLE);

		expect(tracker.current().isUnreachable).toBe(true);

		// Output arrives: the warning clears at once, and one more failed check later does not bring it back.
		main.emit(event("[50/418] Compile DojoGameMode.cpp", 90_000));

		expect(tracker.current()).toMatchObject({ isUnreachable: false, isQuiet: false });

		await clock.advance(QUIET_AFTER_MS + STATUS_TIMEOUT_MS);

		expect(tracker.current()).toMatchObject({ isQuiet: true, isUnreachable: false });
	});

	it("ends with a plain error pointing to Settings when main no longer knows a first-run build", async () =>
	{
		const main = new FakeMain();
		const clock = new ManualClock();
		const { tracker } = track(main, clock, neverAnswers);

		tracker.start();
		main.status = { runId: RUN_ID, state: "unknown", lastEvent: null, eventCount: 0, answer: null };
		await clock.advance(QUIET_AFTER_MS);

		expect(tracker.current().status).toBe("errored");
		expect(tracker.current().error?.code).toBe("run-not-found");
		expect(tracker.current().error?.suggestedAction).toContain("Rebuild sandbox");
		expect(tracker.current().error?.suggestedAction).not.toContain("clean copy");
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

		main.status = { runId: RUN_ID, state: "finished", lastEvent: null, eventCount: 0, answer: { ok: true, value: PASSED } };
		await tracker.checkStatus();
		const count = snapshots.length;

		answerLate(FAILED);
		await flush();

		expect(snapshots.length).toBe(count);
		expect(tracker.current().status).toBe("succeeded");
	});

	it("reports a cancel from a status check as cancelled, not as an error", async () =>
	{
		const main = new FakeMain();
		const clock = new ManualClock();
		const { tracker } = track(main, clock, neverAnswers);

		tracker.start();
		main.status = { runId: RUN_ID, state: "finished", lastEvent: null, eventCount: 0, answer: { ok: false, error: { code: "run-cancelled", message: "Cancelled.", suggestedAction: "Start again." } } };
		await tracker.checkStatus();

		expect(tracker.current().status).toBe("cancelled");
	});
});
