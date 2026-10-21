// The real ProcessLauncher, backed by node:child_process.
import { spawn, type ChildProcessByStdio, type SpawnOptions } from "node:child_process";
import type { Readable } from "node:stream";

import { LineSplitter } from "./LineSplitter";
import type { ProcessExit, ProcessLauncher, ProcessSpec, RunningProcess } from "./ProcessLauncher";
import type { ProcessTreeKiller } from "./ProcessTreeKiller";

/** The spawn call, injectable so tests can check the options without starting anything. */
export type SpawnFunction = (command: string, commandArguments: string[], options: SpawnOptions) => ChildProcessByStdio<null, Readable, Readable>;

/** Spawns without a shell and with stdin ignored (UBT and xcodebuild misbehave on an open stdin), and kills through the platform's tree killer. */
export class NodeProcessLauncher implements ProcessLauncher
{
	private readonly treeKiller: ProcessTreeKiller;
	private readonly spawnProcess: SpawnFunction;

	/** Takes the platform's tree killer and, for tests, the spawn function. */
	constructor(treeKiller: ProcessTreeKiller, spawnProcess: SpawnFunction = spawn as SpawnFunction)
	{
		this.treeKiller = treeKiller;
		this.spawnProcess = spawnProcess;
	}

	/** Starts the process; resolves `exited` on the exit event and then stops reading the pipes. */
	start(spec: ProcessSpec, onLine: (line: string) => void): RunningProcess
	{
		const child = this.spawnProcess(spec.command, spec.commandArguments, {
			shell: false,
			// Verbatim arguments are joined unquoted, the program path included, so `C:\Program Files\...` would split at its spaces (A183).
			...(spec.verbatimArguments ? { argv0: `"${spec.command}"` } : {}),
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

				// On macOS the group outlives its leader, so the kill still reaches a leftover child. On Windows the tree is found
				// through the root's id, which is gone after exit and may already belong to an unrelated process, so no kill then (A188).
				if (hasExited && !treeKiller.startsOwnProcessGroup) return;

				treeKiller.killTree(child.pid);
			},
		};
	}
}
