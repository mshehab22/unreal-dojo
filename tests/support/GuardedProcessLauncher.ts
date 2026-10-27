// Wraps the real process launcher for the engine integration tests: records every launch and refuses a windowed editor (A643, A1074).
import type { ProcessLauncher, ProcessSpec, RunningProcess } from "../../src/main/services/unreal/ProcessLauncher";

/** One process the suite started. */
export interface RecordedLaunch
{
	command: string;
	commandArguments: string[];

	/** True when the command is the windowed editor binary. */
	isEditor: boolean;
}

/** Starts processes through the real launcher, except a `UnrealEditor` started without `-NullRHI`: that throws before anything opens, so no test can show a window. */
export class GuardedProcessLauncher implements ProcessLauncher
{
	readonly launches: RecordedLaunch[] = [];
	private readonly real: ProcessLauncher;

	/** Takes the launcher that really starts processes. */
	constructor(real: ProcessLauncher)
	{
		this.real = real;
	}

	/** Records the launch, refuses a windowed editor, and starts the process. */
	start(spec: ProcessSpec, onLine: (line: string) => void): RunningProcess
	{
		const isEditor = isWindowedEditorBinary(spec.command);

		this.launches.push({ command: spec.command, commandArguments: [...spec.commandArguments], isEditor });

		if (isEditor && !spec.commandArguments.some((argument) => argument.toLowerCase() === "-nullrhi"))
		{
			throw new Error(`The integration suite must not open a windowed editor (A643); refused: ${spec.command} ${spec.commandArguments.join(" ")}`);
		}

		return this.real.start(spec, onLine);
	}

	/** The editor launches, as `command arguments` lines, for the test log. */
	editorLaunchLines(): string[]
	{
		return this.launches.filter((launch) => launch.isEditor).map((launch) => `${launch.command} ${launch.commandArguments.join(" ")}`);
	}
}

/** True for `UnrealEditor` (with or without `.exe`), the binary that opens a window; `UnrealEditor-Cmd` is the console one. */
function isWindowedEditorBinary(command: string): boolean
{
	const fileName = (command.split(/[\\/]/).pop() ?? "").toLowerCase();

	return fileName === "unrealeditor" || fileName === "unrealeditor.exe";
}
