// The process calls the engine locator and toolchain checks need, behind an interface so tests can script the answers.

/** What a finished command printed and how it exited. */
export interface CommandResult
{
	/** False when the program could not be started at all (not installed, not on the path). */
	started: boolean;

	/** Exit code, or null when the program did not start or was killed. */
	exitCode: number | null;

	/** Everything the program printed to stdout. */
	stdout: string;

	/** Everything the program printed to stderr. */
	stderr: string;
}

/** Runs a short command to completion and returns its output. Never throws. */
export interface CommandRunner
{
	/** Runs `command` with `commandArguments` (no shell) and resolves when it exits. */
	run(command: string, commandArguments: string[]): Promise<CommandResult>;
}
