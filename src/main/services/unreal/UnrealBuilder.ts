// Builds the sandbox's editor target with UnrealBuildTool and streams what it prints.
import { LogFilter } from "./LogFilter";
import type { PlatformPaths } from "./PlatformPaths";
import type { ProcessLauncher, ProcessSpec } from "./ProcessLauncher";
import { runSupervised, type SupervisedOutcome, type Timer } from "./SupervisedProcess";

/** A build may take this long before it is killed (cold builds on slow disks are the long case). */
export const BUILD_TIMEOUT_MS = 15 * 60 * 1000;

/** How many times a build whose UnrealBuildTool crashed while starting is tried in all (A890). */
export const STARTUP_CRASH_ATTEMPTS = 3;

/** Pause before trying again after a startup crash; the build that won the race holds UBT's lock by then, so the retry waits behind it. */
export const STARTUP_CRASH_RETRY_DELAY_MS = 1000;

/** The pipeline error after the last startup crash; the raw lines stay in the output as detail. */
export const STARTUP_CRASH_GIVE_UP_MESSAGE = `The Unreal build tool stopped while starting, ${STARTUP_CRASH_ATTEMPTS === 3 ? "three" : String(STARTUP_CRASH_ATTEMPTS)} times in a row. Another Unreal build may be starting at the same moment; wait for it to finish, then try again.`;

/** How many raw lines a failed build shows when none of its lines passed the LogFilter (A891). */
export const UNFILTERED_TAIL_LINES = 20;

/** The UBT switch that turns off its hot reload and Live Coding guard for this build (W10, A1220). */
export const NO_HOT_RELOAD_FROM_IDE_ARGUMENT = "-NoHotReloadFromIDE";

/** The line UBT prints when it refuses to build because an editor with Live Coding is running on the same editor executable. */
const LIVE_CODING_GUARD_LINE = /Unable to build while Live Coding is active/;

/** The pipeline error when UBT's Live Coding guard stopped the build; it names the cause, which is not the learner's code (W10, A1223). */
export const LIVE_CODING_GUARD_MESSAGE = "Unreal refused to build because an Unreal editor with Live Coding is open. Close the other Unreal editor (or press Ctrl+Alt+F11 in it to turn Live Coding off), then run again. Your code was not compiled.";

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

/** Runs `Build.sh` (macOS) or `UnrealBuildTool.exe` (Windows) for `DojoEditor <platform> Development` with `-WaitMutex -Progress`, and `-NoHotReloadFromIDE` unless the app's own sandbox editor is open (A1220). */
export class UnrealBuilder
{
	private readonly paths: PlatformPaths;
	private readonly launcher: ProcessLauncher;
	private readonly timer: Timer;
	private readonly isSandboxEditorOpen: () => boolean;
	private readonly logFilter = new LogFilter();

	/** Takes the platform's paths, a process launcher, the clock, and (optionally) a check for the app's own sandbox editor being open; without it no such editor is assumed. */
	constructor(paths: PlatformPaths, launcher: ProcessLauncher, timer: Timer, isSandboxEditorOpen: () => boolean = () => false)
	{
		this.paths = paths;
		this.launcher = launcher;
		this.timer = timer;
		this.isSandboxEditorOpen = isSandboxEditorOpen;
	}

	/** Builds and resolves when the build program exits. Never throws. */
	async build(request: BuildRequest): Promise<BuildOutcome>
	{
		const paths = this.paths;

		// An editor of any other project must not block this build, but the app's own sandbox editor holds modules this build would replace, so UBT keeps its guard then (A1220).
		const guardArguments = this.isSandboxEditorOpen() ? [] : [NO_HOT_RELOAD_FROM_IDE_ARGUMENT];

		const spec = {
			command: paths.buildProgram(request.engineRoot),
			commandArguments: [EDITOR_TARGET, paths.buildPlatform, "Development", paths.optionArgument("Project", request.projectFile), "-WaitMutex", "-Progress", ...guardArguments],
			verbatimArguments: paths.verbatimArguments,
		};

		const startedAt = this.timer.now();
		let outcome = await this.runOnce(spec, request);

		// UBT backs up its shared log files before it takes its lock, so builds started in the same instant can crash there (A890).
		for (let attempt = 2; attempt <= STARTUP_CRASH_ATTEMPTS && crashedWhileStarting(outcome) && !request.signal.aborted; attempt++)
		{
			request.onLine(`UnrealBuildTool stopped while starting, most likely because another build started at the same moment. Trying again (attempt ${attempt} of ${STARTUP_CRASH_ATTEMPTS}).`, null);

			await this.waitUnlessCancelled(STARTUP_CRASH_RETRY_DELAY_MS, request.signal);

			// A cancel during the pause ends the build here; runOnce would start nothing anyway.
			outcome = request.signal.aborted ? { ...outcome, exitCode: null, cancelled: true } : await this.runOnce(spec, request);
		}

		const succeeded = outcome.started && !outcome.timedOut && !outcome.cancelled && outcome.exitCode === 0;

		return {
			succeeded,
			filteredOutput: outcome.cancelled ? this.logFilter.filterAll(outcome.lines) : filteredOrTail(this.logFilter.filterAll(outcome.lines), outcome.lines, succeeded),
			exitCode: outcome.exitCode,
			timedOut: outcome.timedOut,
			cancelled: outcome.cancelled,
			pipelineError: buildPipelineError(outcome),
			durationMs: this.timer.now() - startedAt,
		};
	}

	/** Waits before a retry, and stops waiting at once when the build is cancelled. */
	private waitUnlessCancelled(delayMs: number, signal: AbortSignal): Promise<void>
	{
		if (signal.aborted) return Promise.resolve();

		return new Promise<void>((resolve) =>
		{
			let settled = false;
			let cancelTimer: () => void = () => undefined;

			const finish = (): void =>
			{
				if (settled) return;

				settled = true;
				cancelTimer();
				signal.removeEventListener("abort", finish);
				resolve();
			};

			signal.addEventListener("abort", finish, { once: true });
			cancelTimer = this.timer.schedule(finish, delayMs);

			// A timer that fired while being scheduled has nothing left to clear.
			if (settled) cancelTimer();
		});
	}

	/** One run of the build program. */
	private runOnce(spec: ProcessSpec, request: BuildRequest): Promise<SupervisedOutcome>
	{
		return runSupervised(this.launcher, this.timer, spec, BUILD_TIMEOUT_MS, request.signal, (line) => request.onLine(line, this.logFilter.progressPercent(line)));
	}
}

/** True when UBT died with an unhandled exception before it logged its log file, that is, before it took its lock or touched the project: safe to run again. */
export function crashedWhileStarting(outcome: SupervisedOutcome): boolean
{
	if (!outcome.started || outcome.timedOut || outcome.cancelled || outcome.exitCode === 0) return false;

	return outcome.lines.some((line) => line.startsWith("Unhandled exception.")) && !outcome.lines.some((line) => line.startsWith("Log file:"));
}

/** True when UBT refused to build because an editor with Live Coding is running. */
export function stoppedByLiveCodingGuard(outcome: SupervisedOutcome): boolean
{
	if (!outcome.started || outcome.timedOut || outcome.cancelled || outcome.exitCode === 0) return false;

	return outcome.lines.some((line) => LIVE_CODING_GUARD_LINE.test(line));
}

/** The filtered output, or for a failed (not cancelled) build whose lines all fell through the filter, its last raw lines, so a failure is never silent (A891). */
function filteredOrTail(filteredOutput: string, lines: string[], succeeded: boolean): string
{
	if (succeeded || filteredOutput !== "") return filteredOutput;

	return lines.filter((line) => line.trim() !== "").slice(-UNFILTERED_TAIL_LINES).join("\n");
}

/** The plain-English pipeline problem for a build, or undefined when the build program ran to the end. */
function buildPipelineError(outcome: SupervisedOutcome): string | undefined
{
	if (outcome.cancelled) return undefined;

	if (!outcome.started) return `The Unreal build tool could not be started (${outcome.startError ?? "unknown reason"}). Check the engine folder in Settings.`;

	if (outcome.timedOut) return "The build took longer than 15 minutes and was stopped.";

	// Still a startup crash after the last attempt: not the learner's code (A890).
	if (crashedWhileStarting(outcome)) return STARTUP_CRASH_GIVE_UP_MESSAGE;

	// UBT's Live Coding guard fired: another editor is the cause, not the learner's code (A1223).
	if (stoppedByLiveCodingGuard(outcome)) return LIVE_CODING_GUARD_MESSAGE;

	return undefined;
}
