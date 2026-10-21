// A scripted ProcessLauncher: each start plays back lines and an exit code, or hangs until killed.
import type { ProcessExit, ProcessLauncher, ProcessSpec, RunningProcess } from "../../src/main/services/unreal/ProcessLauncher";

/** How one scripted process behaves. */
export interface ScriptedProcess
{
	/** Lines printed before exiting. */
	lines?: string[];

	/** Exit code; ignored when `hangs` is set. */
	exitCode?: number;

	/** True to keep running until killed (exit code null then). */
	hangs?: boolean;

	/** True to fail to start, like a missing program. */
	failsToStart?: boolean;

	/** Runs when the process exits normally, before `exited` resolves (for example, to write a report file). */
	onExit?: () => void | Promise<void>;
}

/** Plays back scripted processes in order and records every spec and kill. */
export class FakeProcessLauncher implements ProcessLauncher
{
	/** Every process started, in order. */
	readonly specs: ProcessSpec[] = [];

	/** How many times killTree was called. */
	killCount = 0;

	private readonly scripts: ScriptedProcess[];

	/** Takes one script per expected start. */
	constructor(scripts: ScriptedProcess[])
	{
		this.scripts = scripts;
	}

	/** Starts the next scripted process. */
	start(spec: ProcessSpec, onLine: (line: string) => void): RunningProcess
	{
		this.specs.push(spec);

		const script = this.scripts.shift() ?? { exitCode: 0 };
		let resolveExit: (exit: ProcessExit) => void = () => undefined;
		const exited = new Promise<ProcessExit>((resolve) => (resolveExit = resolve));

		if (script.failsToStart)
		{
			resolveExit({ exitCode: null, started: false, startError: `spawn ${spec.command} ENOENT` });
		}
		else
		{
			for (const line of script.lines ?? []) onLine(line);

			if (!script.hangs)
			{
				void Promise.resolve(script.onExit?.()).then(() => resolveExit({ exitCode: script.exitCode ?? 0, started: true }));
			}
		}

		return {
			exited,
			killTree: () =>
			{
				this.killCount++;
				resolveExit({ exitCode: null, started: true });
			},
		};
	}
}
