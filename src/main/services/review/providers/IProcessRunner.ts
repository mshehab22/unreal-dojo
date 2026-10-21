// The small slice of child-process behavior the Claude Code provider needs, so tests can replace the real spawn.

/** How to run one process. */
export interface ProcessRunOptions
{
	/** Working folder for the process. */
	cwd: string;

	/** Text written to the process's stdin, which is then closed. */
	stdin?: string;

	/** Milliseconds before the process is stopped and the result marked as timed out. */
	timeoutMs: number;

	/** Stops the process when aborted; the result is marked as cancelled. */
	signal?: AbortSignal;

	/** Environment for the process. Defaults to the app's own. */
	env?: Record<string, string | undefined>;
}

/** How one process ended. */
export interface ProcessRunResult
{
	/** Exit code, or null when the process was killed by a signal or never started. */
	exitCode: number | null;

	/** Everything written to stdout. */
	stdout: string;

	/** Everything written to stderr, or the spawn error's message when it never started. */
	stderr: string;

	/** True when the timeout stopped it. */
	timedOut: boolean;

	/** True when the abort signal stopped it. */
	cancelled: boolean;
}

/** Runs a command to completion and collects its output. Never throws; failures are in the result. */
export interface IProcessRunner
{
	/** Runs `command` with `args` and resolves when it exits. */
	run(command: string, args: string[], options: ProcessRunOptions): Promise<ProcessRunResult>;
}
