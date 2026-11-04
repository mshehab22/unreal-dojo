// Runs a quest's automation tests in a headless editor and reads the report it writes.
import type { TestCaseResult } from "@shared/types/run";

import { describeEngineCrash, EngineCrashReader } from "./EngineCrashReader";
import type { PlatformPaths } from "./PlatformPaths";
import type { ProcessLauncher } from "./ProcessLauncher";
import { ReportParser } from "./ReportParser";
import { runSupervised, type Timer } from "./SupervisedProcess";
import { anchoredTestFilter } from "./TestFilter";

/** A headless test run may take this long before it is killed. */
export const TEST_RUN_TIMEOUT_MS = 10 * 60 * 1000;

/** The report Unreal writes inside the report folder. */
export const REPORT_FILE_NAME = "index.json";

/** Reads the report file; null when it is missing. */
export interface ReportReader
{
	/** Returns the file's text, or null when it does not exist. */
	readTextFile(filePath: string): Promise<string | null>;
}

/** What to run. */
export interface TestRunRequest
{
	engineRoot: string;

	/** Full path of `Dojo.uproject`. */
	projectFile: string;

	/** The exact tests to run, for example `["Dojo.Sample.Health.TakesDamage"]`. Report entries for any other test are dropped. */
	testNames: string[];

	/** An empty folder for this run's report, so an older report can never be read by mistake. */
	reportFolder: string;

	signal: AbortSignal;

	/** Called for each output line. */
	onLine: (line: string) => void;
}

/** How a test run went. */
export interface TestRunOutcome
{
	/** Every test the report lists. */
	tests: TestCaseResult[];

	/** Plain-English pipeline problem (no report, timeout, could not start). */
	pipelineError?: string;

	cancelled: boolean;

	/** The editor's exit code: 0 when all passed, 3 seen on a failed assertion. Informational only. */
	exitCode: number | null;

	durationMs: number;
}

/** Runs `UnrealEditor-Cmd` with `-ExecCmds="Automation RunTests ^Name$+...; Quit"` (no `$` on macOS) (verified on 5.8.3, A44) and parses `index.json`. */
export class AutomationTestRunner
{
	private readonly paths: PlatformPaths;
	private readonly launcher: ProcessLauncher;
	private readonly timer: Timer;
	private readonly reportReader: ReportReader;
	private readonly reportParser = new ReportParser();
	private readonly crashReader = new EngineCrashReader();

	/** Takes the platform's paths, a process launcher, the clock, and a file reader for the report. */
	constructor(paths: PlatformPaths, launcher: ProcessLauncher, timer: Timer, reportReader: ReportReader)
	{
		this.paths = paths;
		this.launcher = launcher;
		this.timer = timer;
		this.reportReader = reportReader;
	}

	/** The full argument list, exposed for tests and docs. */
	commandArguments(request: Pick<TestRunRequest, "projectFile" | "testNames" | "reportFolder">): string[]
	{
		const paths = this.paths;

		return [
			paths.pathArgument(request.projectFile),
			paths.optionArgument("ExecCmds", `Automation RunTests ${anchoredTestFilter(request.testNames, paths.testNameEndAnchor)}; Quit`),
			"-Unattended",
			"-NoPause",
			"-NullRHI",
			"-NoSplash",
			"-NoSound",
			"-stdout",
			"-FullStdOutLogOutput",
			paths.optionArgument("ReportExportPath", request.reportFolder),
			"-log",
		];
	}

	/** Runs the tests and resolves after the editor exits. Never throws. */
	async run(request: TestRunRequest): Promise<TestRunOutcome>
	{
		const spec = { command: this.paths.editorCmdBinary(request.engineRoot), commandArguments: this.commandArguments(request), verbatimArguments: this.paths.verbatimArguments };
		const outcome = await runSupervised(this.launcher, this.timer, spec, TEST_RUN_TIMEOUT_MS, request.signal, request.onLine);
		const base = { cancelled: outcome.cancelled, exitCode: outcome.exitCode, durationMs: outcome.durationMs };

		if (outcome.cancelled) return { ...base, tests: [] };

		if (!outcome.started) return { ...base, tests: [], pipelineError: `The headless Unreal editor could not be started (${outcome.startError ?? "unknown reason"}). Check the engine folder in Settings.` };

		if (outcome.timedOut) return { ...base, tests: [], pipelineError: "The test run took longer than 10 minutes and was stopped." };

		const reportText = await this.reportReader.readTextFile(this.paths.join(request.reportFolder, REPORT_FILE_NAME));
		if (reportText === null)
		{
			// A fatal error in this run's own output names the reason; with none (a stall, a kill from outside) the plain exit code message stays, and says nothing about the learner's code.
			const crash = this.crashReader.read(outcome.lines, request.testNames);

			return { ...base, tests: [], pipelineError: crash ? describeEngineCrash(crash, outcome.exitCode) : `The engine stopped before writing a test report (exit code ${String(outcome.exitCode)}).` };
		}

		const report = this.reportParser.parse(reportText);
		if (!report.ok) return { ...base, tests: [], pipelineError: report.problem };

		// Only this quest's tests count: on macOS a longer name that starts the same way also runs (no end anchor there).
		const questTests = report.tests.filter((test) => request.testNames.includes(test.name));

		if (questTests.length === 0) return { ...base, tests: [], pipelineError: `None of this quest's tests ran (${request.testNames.join(", ")}). Check the test names in the quest's test file.` };

		return { ...base, tests: questTests };
	}
}
