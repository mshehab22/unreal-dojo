// The headless loop: write files, build with UnrealBuildTool, run tests in UnrealEditor-Cmd, read the report.
import type { RunResult, TestCaseResult } from "@shared/types/run";

import type { AutomationTestRunner } from "./AutomationTestRunner";
import type { PlatformPaths } from "./PlatformPaths";
import type { ProgressListener } from "./ProgressUpdate";
import type { QuestFileWriter, QuestForWriting } from "./QuestFileWriter";
import type { IRunner, RunnerContext } from "./Runner";
import type { SandboxFileSystem } from "./SandboxFileSystem";
import { PROJECT_FILE_NAME } from "./SandboxProjectService";
import type { Timer } from "./SupervisedProcess";
import { declaredTestNames } from "./TestFilter";
import type { UnrealBuilder } from "./UnrealBuilder";

/** Matches the automation lines worth showing under the progress bar while tests run. */
const TEST_PROGRESS_LINE = /LogAutomation|Test Completed|TEST COMPLETE/i;

/** What the headless runner is built from. */
export interface HeadlessRunnerDependencies
{
	context: RunnerContext;
	paths: PlatformPaths;
	fileSystem: SandboxFileSystem;
	writer: QuestFileWriter;
	builder: UnrealBuilder;
	testRunner: AutomationTestRunner;
	timer: Timer;
}

/** The loop for engines older than 5.8, for the Mac (A45), and whenever a full build is needed. */
export class HeadlessRunner implements IRunner
{
	private readonly dependencies: HeadlessRunnerDependencies;

	/** Takes the run context and every collaborator. */
	constructor(dependencies: HeadlessRunnerDependencies)
	{
		this.dependencies = dependencies;
	}

	/** Runs the whole loop. Never throws. */
	async run(quest: QuestForWriting, files: Record<string, string>, onProgress: ProgressListener, signal: AbortSignal): Promise<RunResult>
	{
		const startedAt = this.dependencies.timer.now();
		const finish = (fields: Partial<RunResult>): RunResult => resultOf(fields, this.dependencies.timer.now() - startedAt);

		try
		{
			return await this.runSteps(quest, files, onProgress, signal, finish);
		}
		catch (error)
		{
			return finish({ error: `The run stopped unexpectedly: ${(error as Error).message}` });
		}
	}

	/** The steps in order; each failure returns early with what is known so far. */
	private async runSteps(quest: QuestForWriting, files: Record<string, string>, onProgress: ProgressListener, signal: AbortSignal, finish: (fields: Partial<RunResult>) => RunResult): Promise<RunResult>
	{
		const { context, paths, fileSystem, writer, builder, testRunner } = this.dependencies;
		const projectFile = paths.join(context.sandboxFolder, PROJECT_FILE_NAME);

		onProgress({ phase: "preparing", lastLine: "Full build and headless tests", loop: "headless", loopReason: "headless loop (the only loop until M1.4)" });

		const testNames = declaredTestNames(quest.tests);
		if (testNames.length === 0) return finish({ error: "This quest's tests declare no automation test, so there is nothing to run." });

		onProgress({ phase: "writing", lastLine: `Writing ${Object.keys(files).length} file(s) for ${quest.id}` });
		await writer.write(context.sandboxFolder, quest, files);

		if (signal.aborted) return finish({ error: "Cancelled." });

		onProgress({ phase: "building", lastLine: "Starting the build", percent: 0 });
		const build = await builder.build({
			engineRoot: context.engineRoot,
			projectFile,
			signal,
			onLine: (line, percent) => onProgress(percent === null ? { phase: "building", lastLine: line } : { phase: "building", lastLine: line, percent }),
		});

		if (build.cancelled) return finish({ compilerOutput: build.filteredOutput, error: "Cancelled." });

		if (!build.succeeded) return finish({ compilerOutput: build.filteredOutput, ...(build.pipelineError ? { error: build.pipelineError } : {}) });

		const reportFolder = await fileSystem.makeTemporaryFolder("dojo-report-");

		try
		{
			onProgress({ phase: "launching", lastLine: "Starting the headless editor" });

			const tests = await testRunner.run({
				engineRoot: context.engineRoot,
				projectFile,
				testNames,
				reportFolder,
				signal,
				onLine: (line) =>
				{
					if (TEST_PROGRESS_LINE.test(line)) onProgress({ phase: "testing", lastLine: line });
				},
			});

			onProgress({ phase: "parsing", lastLine: `${tests.tests.length} test(s) reported` });

			if (tests.cancelled) return finish({ compiled: true, compilerOutput: build.filteredOutput, error: "Cancelled." });

			return finish({ compiled: true, compilerOutput: build.filteredOutput, tests: tests.tests, ...(tests.pipelineError ? { error: tests.pipelineError } : {}) });
		}
		finally
		{
			await fileSystem.removeFolder(reportFolder);
		}
	}
}

/** Fills a RunResult from the known fields; `ok` only when it compiled, at least one test ran, every test passed, and nothing went wrong. */
function resultOf(fields: Partial<RunResult>, durationMs: number): RunResult
{
	const tests: TestCaseResult[] = fields.tests ?? [];
	const compiled = fields.compiled ?? false;
	const testsPassed = tests.filter((test) => test.passed).length;
	const result: RunResult = {
		ok: compiled && tests.length > 0 && testsPassed === tests.length && fields.error === undefined,
		compiled,
		compilerOutput: fields.compilerOutput ?? "",
		tests,
		testsPassed,
		testsTotal: tests.length,
		durationMs,
		loop: "headless",
	};

	if (fields.error !== undefined) result.error = fields.error;

	return result;
}
