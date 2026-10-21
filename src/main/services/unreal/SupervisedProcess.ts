// Runs one engine process under a time limit and a cancel signal, shared by the builder and the headless test runner.
import type { ProcessLauncher, ProcessSpec } from "./ProcessLauncher";

/** How a supervised process ended. */
export interface SupervisedOutcome
{
	/** Exit code, or null when it was killed or never started. */
	exitCode: number | null;

	/** False when the program could not be started. */
	started: boolean;

	/** Why it could not start. */
	startError?: string;

	/** True when the time limit killed it. */
	timedOut: boolean;

	/** True when the cancel signal killed it. */
	cancelled: boolean;

	/** Every output line, in order. */
	lines: string[];

	/** Wall time from start to exit. */
	durationMs: number;
}

/** The time source, so tests control timeouts without waiting. */
export interface Timer
{
	/** Milliseconds since some fixed point. */
	now(): number;

	/** Calls `callback` after `delayMs`; returns a function that cancels it. */
	schedule(callback: () => void, delayMs: number): () => void;
}

/** The real clock. */
export const SYSTEM_TIMER: Timer = {
	now: () => Date.now(),
	schedule: (callback, delayMs) =>
	{
		const handle = setTimeout(callback, delayMs);

		return () => clearTimeout(handle);
	},
};

/** Starts the process, kills its tree on timeout or cancel, and resolves when the process exits. Never throws. */
export async function runSupervised(launcher: ProcessLauncher, timer: Timer, spec: ProcessSpec, timeoutMs: number, signal: AbortSignal, onLine: (line: string) => void): Promise<SupervisedOutcome>
{
	const startedAt = timer.now();
	const lines: string[] = [];
	let timedOut = false;
	let cancelled = false;

	if (signal.aborted) return { exitCode: null, started: false, timedOut, cancelled: true, lines, durationMs: 0 };

	const running = launcher.start(spec, (line) =>
	{
		lines.push(line);
		onLine(line);
	});

	const cancelTimeout = timer.schedule(() =>
	{
		timedOut = true;
		running.killTree();
	}, timeoutMs);

	const onAbort = (): void =>
	{
		cancelled = true;
		running.killTree();
	};

	signal.addEventListener("abort", onAbort, { once: true });

	// A cancel that arrived while the process was starting (an early output line can trigger it) fired before the listener existed.
	if (signal.aborted) onAbort();

	const exit = await running.exited;

	cancelTimeout();
	signal.removeEventListener("abort", onAbort);

	// A daemon the engine started can outlive it; on macOS this clears the rest of the group.
	if (timedOut || cancelled) running.killTree();

	return { exitCode: exit.exitCode, started: exit.started, startError: exit.startError, timedOut, cancelled, lines, durationMs: timer.now() - startedAt };
}
