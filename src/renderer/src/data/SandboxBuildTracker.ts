// Follows one sandbox create or rebuild from the window: subscribes before it starts, keeps a ticking clock, and asks main how the run
// stands when no new output arrives, so a lost event or a lost answer can never leave the screen frozen. A recovery fallback (A822);
// the cause of the hang that prompted it is unknown.
import type { DojoApi } from "@shared/ipc";
import type { SandboxSetupResult } from "@shared/types/engine";
import type { AppError } from "@shared/types/errors";
import type { BuildProgressEvent, RunAnswer, RunStatus } from "@shared/types/run";

import { toAppError } from "./toAppError";

/** Where a sandbox build stands. */
export type SandboxBuildStatus = "idle" | "running" | "succeeded" | "failed" | "cancelled" | "errored";

/** Which build is tracked; it decides what to suggest if main loses track of it. */
export type SandboxBuildContext = "first-run" | "rebuild";

/** Everything the screen shows about the build. A new object on every change. */
export interface SandboxBuildSnapshot
{
	readonly status: SandboxBuildStatus;
	readonly progress: BuildProgressEvent | null;
	readonly result: SandboxSetupResult | null;
	readonly error: AppError | null;

	/** Time since the build started, ticking in the window even when no event arrives. */
	readonly elapsedMs: number;

	/** True while running when no new output has arrived for a while. Stays true until new output does. */
	readonly isQuiet: boolean;

	/** Time since the last new output (an event, or a status answer carrying events the window had not seen). */
	readonly silentForMs: number;

	/** True once main has said the run is still going during this quiet stretch. */
	readonly isConfirmedRunning: boolean;

	/** True after several status checks in a row failed or timed out. */
	readonly isUnreachable: boolean;

	/** True while a status check is in flight. */
	readonly isChecking: boolean;
}

/** The time source, so tests move time by hand. */
export interface TrackerClock
{
	now(): number;

	/** Calls `callback` every `intervalMs`; returns the function that stops it. */
	every(callback: () => void, intervalMs: number): () => void;

	/** Calls `callback` once after `delayMs`; returns the function that cancels it. */
	after(callback: () => void, delayMs: number): () => void;
}

/** The DojoApi methods the tracker uses. */
export type TrackerClient = Pick<DojoApi, "onBuildProgress" | "getRunStatus" | "cancelRun">;

/** No new output for this long marks the build quiet and asks main how it stands. */
export const QUIET_AFTER_MS = 15_000;

/** While quiet, main is asked again this often. */
export const CHECK_AGAIN_AFTER_MS = 15_000;

/** A status check that has not answered by then counts as failed, so the next round can try again. */
export const STATUS_TIMEOUT_MS = 10_000;

/** This many failed checks in a row mark main as unreachable. */
export const FAILED_CHECKS_BEFORE_UNREACHABLE = 3;

/** How often the window's clock ticks. */
const TICK_MS = 1_000;

/** The real clock. */
export const SYSTEM_TRACKER_CLOCK: TrackerClock = {
	now: () => Date.now(),
	every: (callback, intervalMs) =>
	{
		const handle = setInterval(callback, intervalMs);

		return () => clearInterval(handle);
	},
	after: (callback, delayMs) =>
	{
		const handle = setTimeout(callback, delayMs);

		return () => clearTimeout(handle);
	},
};

/** The state before any build. */
const IDLE: SandboxBuildSnapshot = {
	status: "idle",
	progress: null,
	result: null,
	error: null,
	elapsedMs: 0,
	isQuiet: false,
	silentForMs: 0,
	isConfirmedRunning: false,
	isUnreachable: false,
	isChecking: false,
};

/**
 * The error shown when main no longer knows the run (the app restarted, or the run was forgotten). A first-run retry would stop at
 * `sandbox-folder-not-empty` once the template was copied, so it points to Settings' rebuild instead.
 */
function lostRunError(runId: string, context: SandboxBuildContext): AppError
{
	return {
		code: "run-not-found",
		message: "Unreal Dojo lost track of this build.",
		suggestedAction: context === "first-run"
			? "Restart Unreal Dojo, then open Settings and use Rebuild sandbox. Starting the build again here would stop, because the sandbox folder already holds the copy."
			: "Restart Unreal Dojo, then use Rebuild sandbox again.",
		detail: runId,
	};
}

/** One tracked build at a time. Call `dispose` when the screen goes away. */
export class SandboxBuildTracker
{
	private snapshot: SandboxBuildSnapshot = IDLE;
	private runId: string | null = null;
	private startedAt = 0;
	private lastOutputAt = 0;
	private lastCheckedAt = 0;
	private knownEventCount = 0;
	private failedChecks = 0;
	private settled = true;
	private stopListening: (() => void) | null = null;
	private stopTicking: (() => void) | null = null;

	constructor(
		private readonly client: TrackerClient,
		private readonly operation: (runId: string) => Promise<SandboxSetupResult>,
		private readonly onChange: (snapshot: SandboxBuildSnapshot) => void,
		private readonly context: SandboxBuildContext,
		private readonly clock: TrackerClock = SYSTEM_TRACKER_CLOCK,
		private readonly newRunId: () => string = () => crypto.randomUUID(),
	)
	{
	}

	/** The current state. */
	current(): SandboxBuildSnapshot
	{
		return this.snapshot;
	}

	/** Starts a build. The progress listener is attached before the call goes out. */
	start(): void
	{
		this.releaseRun();

		const runId = this.newRunId();
		const now = this.clock.now();

		this.runId = runId;
		this.startedAt = now;
		this.lastOutputAt = now;
		this.lastCheckedAt = now;
		this.knownEventCount = 0;
		this.failedChecks = 0;
		this.settled = false;
		this.stopListening = this.client.onBuildProgress((event) => this.receive(runId, event));
		this.stopTicking = this.clock.every(() => this.tick(runId), TICK_MS);
		this.update({ ...IDLE, status: "running" });

		let call: Promise<SandboxSetupResult>;

		try
		{
			call = this.operation(runId);
		}
		catch (thrown)
		{
			call = Promise.reject(thrown);
		}

		call.then(
			(value) => this.settle(runId, { ok: true, value }),
			(thrown: unknown) => this.settle(runId, { ok: false, error: toAppError(thrown) }),
		);
	}

	/** Asks main to stop the build; the answer (or a status check) reports the cancel. */
	cancel(): void
	{
		if (this.runId && !this.settled) void this.client.cancelRun(this.runId).catch(() => undefined);
	}

	/** Asks main right now how the build stands (the "Check status" button, and the quiet watchdog). Gives up after STATUS_TIMEOUT_MS. */
	async checkStatus(): Promise<void>
	{
		const runId = this.runId;

		if (!runId || this.settled || this.snapshot.isChecking) return;

		this.lastCheckedAt = this.clock.now();
		this.update({ ...this.snapshot, isChecking: true });

		const status = await this.statusWithTimeout(runId);

		if (runId !== this.runId || this.settled) return;

		if (!status)
		{
			this.failedChecks += 1;
			this.update({ ...this.snapshot, isChecking: false, isUnreachable: this.failedChecks >= FAILED_CHECKS_BEFORE_UNREACHABLE });
			return;
		}

		this.failedChecks = 0;

		if (status.state === "finished" && status.answer)
		{
			this.settle(runId, status.answer, status.lastEvent);
			return;
		}

		if (status.state === "unknown")
		{
			this.settle(runId, { ok: false, error: lostRunError(runId, this.context) });
			return;
		}

		// Still running. Only events the window had not seen count as new output; the same event again means the build is alive but silent.
		if (status.eventCount > this.knownEventCount)
		{
			this.knownEventCount = status.eventCount;
			this.lastOutputAt = this.clock.now();
			this.update({ ...this.snapshot, progress: status.lastEvent ?? this.snapshot.progress, isChecking: false, isUnreachable: false, isQuiet: false, isConfirmedRunning: false, silentForMs: 0 });
			return;
		}

		this.update({ ...this.snapshot, isChecking: false, isUnreachable: false, isConfirmedRunning: true });
	}

	/** Stops listening and ticking; a late answer is ignored. */
	dispose(): void
	{
		this.settled = true;
		this.releaseRun();
	}

	/** The status answer, or null when the call failed or did not answer in time. */
	private statusWithTimeout(runId: string): Promise<RunStatus | null>
	{
		return new Promise((resolve) =>
		{
			const cancelTimeout = this.clock.after(() => resolve(null), STATUS_TIMEOUT_MS);

			this.client.getRunStatus(runId).then(
				(status) =>
				{
					cancelTimeout();
					resolve(status);
				},
				() =>
				{
					cancelTimeout();
					resolve(null);
				},
			);
		});
	}

	/** Takes a progress event for the current run. */
	private receive(runId: string, event: BuildProgressEvent): void
	{
		if (event.runId !== runId || runId !== this.runId || this.settled) return;

		// An arriving event proves the connection to main works, so earlier failed status checks no longer count.
		this.knownEventCount += 1;
		this.lastOutputAt = this.clock.now();
		this.failedChecks = 0;
		this.update({ ...this.snapshot, progress: event, isQuiet: false, isConfirmedRunning: false, isUnreachable: false, silentForMs: 0, elapsedMs: this.elapsed(event) });
	}

	/** Advances the clock; when no new output came for a while, marks the build quiet and asks main, then again every CHECK_AGAIN_AFTER_MS. */
	private tick(runId: string): void
	{
		if (runId !== this.runId || this.settled) return;

		const now = this.clock.now();
		const silentForMs = now - this.lastOutputAt;
		const isQuiet = silentForMs >= QUIET_AFTER_MS;

		this.update({ ...this.snapshot, elapsedMs: this.elapsed(this.snapshot.progress), isQuiet, silentForMs });

		if (isQuiet && now - this.lastCheckedAt >= CHECK_AGAIN_AFTER_MS) void this.checkStatus();
	}

	/** Applies the run's answer once, from whichever arrives first: the call itself or a status check. */
	private settle(runId: string, answer: RunAnswer, lastEvent: BuildProgressEvent | null = null): void
	{
		if (runId !== this.runId || this.settled) return;

		this.settled = true;
		this.releaseRun();

		const progress = lastEvent ?? this.snapshot.progress;
		const base = { ...this.snapshot, progress, isQuiet: false, isChecking: false, isConfirmedRunning: false, isUnreachable: false, silentForMs: 0, elapsedMs: this.elapsed(progress) };

		if (answer.ok)
		{
			// The value is the createSandbox or rebuildSandbox answer this tracker started.
			const result = answer.value as SandboxSetupResult;

			this.update({ ...base, status: result.ok ? "succeeded" : "failed", result, elapsedMs: result.durationMs || base.elapsedMs });
			return;
		}

		this.update({ ...base, status: answer.error.code === "run-cancelled" ? "cancelled" : "errored", error: answer.error });
	}

	/** Elapsed time: the window's own clock, or main's figure when that is further along. */
	private elapsed(event: BuildProgressEvent | null): number
	{
		return Math.max(this.clock.now() - this.startedAt, event?.elapsedMs ?? 0);
	}

	/** Detaches the listener and the clock of the current run. */
	private releaseRun(): void
	{
		this.stopListening?.();
		this.stopTicking?.();
		this.stopListening = null;
		this.stopTicking = null;
	}

	/** Stores and announces a new snapshot. */
	private update(snapshot: SandboxBuildSnapshot): void
	{
		this.snapshot = snapshot;
		this.onChange(snapshot);
	}
}
