// Runs one long engine process (build or headless tests) with stdin closed, collecting its output, resolving on exit.
import { spawn } from "node:child_process";

/** How a process ended and everything it printed. */
export interface ProcessResult
{
	/** Exit code, or null when it was killed. */
	exitCode: number | null;
	timedOut: boolean;
	lines: string[];
	durationMilliseconds: number;
}

/** Grace period between asking a timed-out process to stop and killing it. */
const KILL_GRACE_MILLISECONDS = 15_000;

/**
 * Spawns `command` without a shell. Resolves on the process exit event, not when its output closes, because a child
 * daemon of the editor can keep the pipes open after the editor has quit (unreal-pipeline spec). Never rejects.
 */
export function runProcess(command: string, args: readonly string[], timeoutMilliseconds: number, onLine?: (line: string) => void): Promise<ProcessResult>
{
	const started = performance.now();
	const lines: string[] = [];
	let pending = "";
	let timedOut = false;

	return new Promise((resolve) =>
	{
		const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });

		/** Splits incoming output into lines. */
		const collect = (chunk: Buffer): void =>
		{
			const parts = (pending + chunk.toString("utf8")).split(/\r?\n/);

			pending = parts.pop() ?? "";

			for (const line of parts)
			{
				lines.push(line);
				onLine?.(line);
			}
		};

		child.stdout.on("data", collect);
		child.stderr.on("data", collect);

		const timer = setTimeout(() =>
		{
			timedOut = true;
			child.kill("SIGTERM");
			setTimeout(() => child.kill("SIGKILL"), KILL_GRACE_MILLISECONDS).unref();
		}, timeoutMilliseconds);

		/** Finishes once, on exit or on a spawn error. */
		const finish = (exitCode: number | null): void =>
		{
			clearTimeout(timer);

			if (pending !== "") lines.push(pending);

			resolve({ exitCode, timedOut, lines, durationMilliseconds: performance.now() - started });
		};

		child.on("error", (error) =>
		{
			lines.push(`could not start ${command}: ${error.message}`);
			finish(null);
		});
		child.on("exit", (code) => finish(code));
	});
}
