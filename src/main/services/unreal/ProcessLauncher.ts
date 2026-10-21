// Starts long engine processes (builds, headless test runs) that stream output and can be killed with all their children.

/** What to start. Arguments are already shaped for the platform (see PlatformPaths.optionArgument). */
export interface ProcessSpec
{
	/** Program to run, without a shell. */
	command: string;

	/** Arguments in order. */
	commandArguments: string[];

	/** True to pass the arguments exactly as written (Windows, so Unreal sees its own quotes). */
	verbatimArguments: boolean;
}

/** How a started process ended. */
export interface ProcessExit
{
	/** Exit code, or null when the process was killed by a signal. */
	exitCode: number | null;

	/** False when the program could not be started at all. */
	started: boolean;

	/** Why it could not start, when it did not. */
	startError?: string;
}

/** A process that is running. */
export interface RunningProcess
{
	/** Resolves when the process itself exits, not when its output pipes close: a child daemon can hold them open long after. */
	readonly exited: Promise<ProcessExit>;

	/** Kills the process and every process it started. Safe to call more than once or after exit. */
	killTree(): void;
}

/** Starts processes with stdin ignored and stdout and stderr delivered line by line. */
export interface ProcessLauncher
{
	/** Starts the process and calls `onLine` for every complete output line from either stream. */
	start(spec: ProcessSpec, onLine: (line: string) => void): RunningProcess;
}
