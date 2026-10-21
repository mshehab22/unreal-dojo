// The real CommandRunner, backed by node:child_process.
import { spawn } from "node:child_process";

import type { CommandResult, CommandRunner } from "./CommandRunner";
import { createProcessTreeKiller } from "./createUnrealPlatform";
import type { ProcessTreeKiller } from "./ProcessTreeKiller";

/** How long a toolchain or registry query, or a snippet check, may take before it is killed. */
const COMMAND_TIMEOUT_MS = 20_000;

/** Spawns a program without a shell, with stdin closed (UBT and xcodebuild misbehave on an open stdin), and collects its output. */
export class NodeCommandRunner implements CommandRunner
{
	private readonly treeKiller: ProcessTreeKiller;
	private readonly timeoutMs: number;

	/** Takes the platform's tree killer and the time limit; both default to this machine's and 20 seconds. */
	constructor(treeKiller: ProcessTreeKiller = createProcessTreeKiller(process.platform), timeoutMs: number = COMMAND_TIMEOUT_MS)
	{
		this.treeKiller = treeKiller;
		this.timeoutMs = timeoutMs;
	}

	/** Runs the command and resolves with its output; a program that cannot start resolves with `started: false`. On the time limit the whole process tree is killed and the run resolves at once with `exitCode: null` (A412). */
	run(command: string, commandArguments: string[], workingFolder?: string): Promise<CommandResult>
	{
		return new Promise((resolve) =>
		{
			let stdout = "";
			let stderr = "";
			let settled = false;

			const finish = (result: CommandResult): void =>
			{
				if (settled) return;

				settled = true;
				clearTimeout(timer);
				resolve(result);
			};

			// Its own process group, so a timeout reaches what it started (xcrun starts clang, and clang -cc1 holds stderr open).
			const child = spawn(command, commandArguments, {
				shell: false,
				windowsHide: true,
				detached: this.treeKiller.startsOwnProcessGroup,
				stdio: ["ignore", "pipe", "pipe"],
				...(workingFolder ? { cwd: workingFolder } : {}),
			});

			const timer = setTimeout(() =>
			{
				if (child.pid !== undefined) this.treeKiller.killTree(child.pid);

				child.stdout.destroy();
				child.stderr.destroy();
				finish({ started: true, exitCode: null, stdout, stderr });
			}, this.timeoutMs);

			child.stdout.setEncoding("utf8");
			child.stderr.setEncoding("utf8");
			child.stdout.on("data", (chunk: string) => (stdout += chunk));
			child.stderr.on("data", (chunk: string) => (stderr += chunk));

			child.on("error", (error) => finish({ started: false, exitCode: null, stdout, stderr: stderr + error.message }));
			child.on("close", (exitCode) => finish({ started: true, exitCode, stdout, stderr }));
		});
	}
}
