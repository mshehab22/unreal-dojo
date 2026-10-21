// Runs a child process with Node's spawn: stdin in, stdout and stderr collected, with a timeout and a cancel that ask nicely before forcing.
import { spawn } from "node:child_process";

import type { IProcessRunner, ProcessRunOptions, ProcessRunResult } from "./IProcessRunner";

/** Milliseconds between the polite stop (SIGINT, which lets Claude Code end its turn) and the forced kill. */
const FORCE_KILL_DELAY_MS = 5000;

/** Quotes one argument for cmd.exe, which Windows needs to run a `.cmd` shim such as npm's `claude.cmd`. */
function quoteForWindowsShell(argument: string): string
{
	return `"${argument.replace(/"/g, "\"\"")}"`;
}

/** Runs real processes. On Windows a `.cmd` or `.bat` command goes through the shell with every argument quoted. */
export class NodeProcessRunner implements IProcessRunner
{
	/** Spawns the process and resolves with its output once it exits, times out, or is cancelled. */
	run(command: string, args: string[], options: ProcessRunOptions): Promise<ProcessRunResult>
	{
		const needsShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(command);
		const spawnCommand = needsShell ? quoteForWindowsShell(command) : command;
		const spawnArguments = needsShell ? args.map(quoteForWindowsShell) : args;

		return new Promise((resolve) =>
		{
			let stdout = "";
			let stderr = "";
			let timedOut = false;
			let cancelled = false;
			let settled = false;
			let forceKillTimer: NodeJS.Timeout | undefined;

			const child = spawn(spawnCommand, spawnArguments, { cwd: options.cwd, env: options.env ?? process.env, shell: needsShell, windowsHide: true });

			/** Asks the process to stop, then kills it if it has not exited a few seconds later. */
			const stop = (): void =>
			{
				child.kill("SIGINT");
				forceKillTimer = setTimeout(() => child.kill("SIGKILL"), FORCE_KILL_DELAY_MS);
			};

			/** Resolves once, clearing timers and listeners. */
			const finish = (exitCode: number | null): void =>
			{
				if (settled) return;

				settled = true;
				clearTimeout(timeoutTimer);
				clearTimeout(forceKillTimer);
				options.signal?.removeEventListener("abort", onAbort);
				resolve({ exitCode, stdout, stderr, timedOut, cancelled });
			};

			/** Stops the process when the learner cancels. */
			const onAbort = (): void =>
			{
				cancelled = true;
				stop();
			};

			const timeoutTimer = setTimeout(() =>
			{
				timedOut = true;
				stop();
			}, options.timeoutMs);

			if (options.signal?.aborted) onAbort();
			else options.signal?.addEventListener("abort", onAbort, { once: true });

			child.stdout.setEncoding("utf8");
			child.stderr.setEncoding("utf8");
			child.stdout.on("data", (chunk: string) => { stdout += chunk; });
			child.stderr.on("data", (chunk: string) => { stderr += chunk; });

			child.on("error", (error) =>
			{
				stderr += error.message;
				finish(null);
			});

			child.on("close", (exitCode) => finish(exitCode));

			// A process that exits before reading stdin makes the write fail; the exit code already tells the story.
			child.stdin.on("error", () => undefined);
			child.stdin.end(options.stdin ?? "");
		});
	}
}
