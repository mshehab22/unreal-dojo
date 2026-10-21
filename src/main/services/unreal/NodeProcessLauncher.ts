// The real ProcessLauncher, backed by node:child_process.
import { spawn } from "node:child_process";

import { LineSplitter } from "./LineSplitter";
import type { ProcessExit, ProcessLauncher, ProcessSpec, RunningProcess } from "./ProcessLauncher";
import type { ProcessTreeKiller } from "./ProcessTreeKiller";

/** Spawns without a shell and with stdin ignored (UBT and xcodebuild misbehave on an open stdin), and kills through the platform's tree killer. */
export class NodeProcessLauncher implements ProcessLauncher
{
	private readonly treeKiller: ProcessTreeKiller;

	/** Takes the platform's tree killer. */
	constructor(treeKiller: ProcessTreeKiller)
	{
		this.treeKiller = treeKiller;
	}

	/** Starts the process; resolves `exited` on the exit event and then stops reading the pipes. */
	start(spec: ProcessSpec, onLine: (line: string) => void): RunningProcess
	{
		const child = spawn(spec.command, spec.commandArguments, {
			shell: false,
			windowsHide: true,
			windowsVerbatimArguments: spec.verbatimArguments,
			detached: this.treeKiller.startsOwnProcessGroup,
			stdio: ["ignore", "pipe", "pipe"],
		});

		const outputLines = new LineSplitter(onLine);
		const errorLines = new LineSplitter(onLine);

		child.stdout.setEncoding("utf8");
		child.stderr.setEncoding("utf8");
		child.stdout.on("data", (chunk: string) => outputLines.push(chunk));
		child.stderr.on("data", (chunk: string) => errorLines.push(chunk));

		let hasExited = false;

		const exited = new Promise<ProcessExit>((resolve) =>
		{
			child.on("error", (error) =>
			{
				hasExited = true;
				resolve({ exitCode: null, started: false, startError: error.message });
			});

			child.on("exit", (exitCode) =>
			{
				hasExited = true;
				outputLines.flush();
				errorLines.flush();
				child.stdout.destroy();
				child.stderr.destroy();
				resolve({ exitCode, started: true });
			});
		});

		const treeKiller = this.treeKiller;

		return {
			exited,
			killTree(): void
			{
				if (child.pid === undefined) return;

				// The group may still hold children after the root exits, so kill even then on macOS.
				if (hasExited && !treeKiller.startsOwnProcessGroup) return;

				treeKiller.killTree(child.pid);
			},
		};
	}
}
