// Builds the sandbox's editor target with UnrealBuildTool and streams what it prints.
import { LogFilter } from "./LogFilter";
import type { PlatformPaths } from "./PlatformPaths";
import type { ProcessLauncher } from "./ProcessLauncher";
import { runSupervised, type SupervisedOutcome, type Timer } from "./SupervisedProcess";

/** A build may take this long before it is killed (cold builds on slow disks are the long case). */
export const BUILD_TIMEOUT_MS = 15 * 60 * 1000;

/** The editor target every sandbox has. */
export const EDITOR_TARGET = "DojoEditor";

/** What to build. */
export interface BuildRequest
{
	/** Engine root folder (the one that contains `Engine/`). */
	engineRoot: string;

	/** Full path of `Dojo.uproject`. */
	projectFile: string;

	/** Aborting kills the build's process tree. */
	signal: AbortSignal;

	/** Called for each output line, with a rough percent when the line tells one. */
	onLine: (line: string, percent: number | null) => void;
}

/** How a build went. */
export interface BuildOutcome
{
	/** True when UBT exited with 0. */
	succeeded: boolean;

	/** Errors, warnings, and quest or test lines (LogFilter). */
	filteredOutput: string;

	/** The build program's exit code, or null when killed or not started. */
	exitCode: number | null;

	/** True when the 15 minute limit stopped it. */
	timedOut: boolean;

	/** True when the learner cancelled it. */
	cancelled: boolean;

	/** Plain-English pipeline problem (could not start, timed out), separate from compile errors. */
	pipelineError?: string;

	/** Wall time. */
	durationMs: number;
}

/** Runs `Build.sh` (macOS) or `UnrealBuildTool.exe` (Windows) for `DojoEditor <platform> Development` with `-WaitMutex -Progress`. */
export class UnrealBuilder
{
	private readonly paths: PlatformPaths;
	private readonly launcher: ProcessLauncher;
	private readonly timer: Timer;
	private readonly logFilter = new LogFilter();

	/** Takes the platform's paths, a process launcher, and the clock. */
	constructor(paths: PlatformPaths, launcher: ProcessLauncher, timer: Timer)
	{
		this.paths = paths;
		this.launcher = launcher;
		this.timer = timer;
	}

	/** Builds and resolves when the build program exits. Never throws. */
	async build(request: BuildRequest): Promise<BuildOutcome>
	{
		const paths = this.paths;
		const spec = {
			command: paths.buildProgram(request.engineRoot),
			commandArguments: [EDITOR_TARGET, paths.buildPlatform, "Development", paths.optionArgument("Project", request.projectFile), "-WaitMutex", "-Progress"],
			verbatimArguments: paths.verbatimArguments,
		};

		const outcome = await runSupervised(this.launcher, this.timer, spec, BUILD_TIMEOUT_MS, request.signal, (line) => request.onLine(line, this.logFilter.progressPercent(line)));

		return {
			succeeded: outcome.started && !outcome.timedOut && !outcome.cancelled && outcome.exitCode === 0,
			filteredOutput: this.logFilter.filterAll(outcome.lines),
			exitCode: outcome.exitCode,
			timedOut: outcome.timedOut,
			cancelled: outcome.cancelled,
			pipelineError: buildPipelineError(outcome),
			durationMs: outcome.durationMs,
		};
	}
}

/** The plain-English pipeline problem for a build, or undefined when the build program ran to the end. */
function buildPipelineError(outcome: SupervisedOutcome): string | undefined
{
	if (outcome.cancelled) return undefined;

	if (!outcome.started) return `The Unreal build tool could not be started (${outcome.startError ?? "unknown reason"}). Check the engine folder in Settings.`;

	if (outcome.timedOut) return "The build took longer than 15 minutes and was stopped.";

	return undefined;
}
