// The real CommandRunner, backed by node:child_process.
import { spawn } from "node:child_process";

import type { CommandResult, CommandRunner } from "./CommandRunner";

/** How long a toolchain or registry query may take before it is killed. These are all quick lookups. */
const COMMAND_TIMEOUT_MS = 20_000;

/** Spawns a program without a shell, with stdin closed (UBT and xcodebuild misbehave on an open stdin), and collects its output. */
export class NodeCommandRunner implements CommandRunner
{
	/** Runs the command and resolves with its output; a program that cannot start resolves with `started: false`. */
	run(command: string, commandArguments: string[]): Promise<CommandResult>
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

			const child = spawn(command, commandArguments, { shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });

			const timer = setTimeout(() => child.kill(), COMMAND_TIMEOUT_MS);

			child.stdout.setEncoding("utf8");
			child.stderr.setEncoding("utf8");
			child.stdout.on("data", (chunk: string) => (stdout += chunk));
			child.stderr.on("data", (chunk: string) => (stderr += chunk));

			child.on("error", (error) => finish({ started: false, exitCode: null, stdout, stderr: stderr + error.message }));
			child.on("close", (exitCode) => finish({ started: true, exitCode, stdout, stderr }));
		});
	}
}
