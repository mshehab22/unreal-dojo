// The fast loop: write files, Live Coding compile in the open editor (Windows), run the quest's tests there over MCP.
import type { RunResult, TestCaseResult } from "@shared/types/run";

import { EditorClientError } from "./EditorClientError";
import type { EditorSession } from "./EditorLauncher";
import type { EditorTestCase } from "./EditorToolClient";
import { readLiveCodingAnswer } from "./LiveCodingAnswer";
import { LogFilter } from "./LogFilter";
import type { ProgressListener } from "./ProgressUpdate";
import type { QuestFileWriter, QuestForWriting } from "./QuestFileWriter";
import type { IRunner, RunnerContext } from "./Runner";
import { runResultOf } from "./runResultOf";
import type { Timer } from "./SupervisedProcess";
import { declaredTestNames } from "./TestFilter";

/** Test states that count as a pass, as in the headless report. */
const PASSING_STATES = new Set(["success", "successwithwarnings"]);

/** Runs the headless loop instead, with the reason shown to the learner. */
export type HeadlessFallback = (quest: QuestForWriting, files: Record<string, string>, onProgress: ProgressListener, signal: AbortSignal, reason: string) => Promise<RunResult>;

/** What the fast runner is built from. */
export interface LiveEditorRunnerDependencies
{
	context: RunnerContext;
	session: EditorSession;
	writer: QuestFileWriter;
	timer: Timer;

	/** True on Windows: write the files and Live Coding compile them. False on macOS, where the chooser only picks this runner for code the editor already has (A45). */
	liveCodingAvailable: boolean;

	/** Used when the editor cannot finish the run: it stopped answering, Live Coding needs a full build, or it does not know the quest's tests. */
	fallBackToHeadless: HeadlessFallback;
}

/** The fast loop's IRunner. Never throws; a lost editor, an editor tool error, or a change Live Coding cannot take hands the run to the headless loop with a reason. */
export class LiveEditorRunner implements IRunner
{
	private readonly dependencies: LiveEditorRunnerDependencies;
	private readonly logFilter = new LogFilter();

	/** Takes the context, the open editor, and the fallback. */
	constructor(dependencies: LiveEditorRunnerDependencies)
	{
		this.dependencies = dependencies;
	}

	/** Runs the fast loop. */
	async run(quest: QuestForWriting, files: Record<string, string>, onProgress: ProgressListener, signal: AbortSignal): Promise<RunResult>
	{
		const startedAt = this.dependencies.timer.now();
		const finish = (fields: Partial<RunResult>): RunResult => runResultOf(fields, this.dependencies.timer.now() - startedAt, "fast");
		const fallBack = (reason: string): Promise<RunResult> => this.dependencies.fallBackToHeadless(quest, files, onProgress, signal, reason);

		try
		{
			return await this.runSteps(quest, files, onProgress, signal, finish, fallBack);
		}
		catch (error)
		{
			if (error instanceof EditorClientError && error.kind === "connection") return fallBack(`Full build: the editor stopped answering (${error.message}).`);
			if (error instanceof EditorClientError) return fallBack(`Full build: the editor could not run the tests (${error.message}).`);

			return finish({ error: `The fast loop stopped unexpectedly: ${(error as Error).message}` });
		}
	}

	/** The steps in order; each failure returns early or falls back. */
	private async runSteps(quest: QuestForWriting, files: Record<string, string>, onProgress: ProgressListener, signal: AbortSignal, finish: (fields: Partial<RunResult>) => RunResult, fallBack: (reason: string) => Promise<RunResult>): Promise<RunResult>
	{
		const { context, session, writer, liveCodingAvailable } = this.dependencies;

		const testNames = declaredTestNames(quest.tests);
		if (testNames.length === 0) return finish({ error: "This quest's tests declare no automation test, so there is nothing to run." });

		let compilerOutput = "";

		if (liveCodingAvailable)
		{
			onProgress({ phase: "writing", lastLine: `Writing ${Object.keys(files).length} file(s) for ${quest.id}` });
			await writer.write(context.sandboxFolder, quest, files);

			if (signal.aborted) return finish({ error: "Cancelled." });

			onProgress({ phase: "building", lastLine: "Live Coding compile in the open editor" });

			const answer = await this.compile();
			compilerOutput = this.logFilter.filterAll(answer.output.split(/\r?\n/)) || answer.output;

			if (answer.status === "failed") return finish({ compilerOutput });
			if (answer.status !== "succeeded" && answer.status !== "no-changes") return fallBack(`Full build: Live Coding answered "${answer.status}".`);
		}

		if (signal.aborted) return finish({ compiled: true, compilerOutput, error: "Cancelled." });

		onProgress({ phase: "testing", lastLine: `Running ${testNames.length} test(s) in the open editor` });

		const summary = await session.client.runTests(testNames);
		const tests = summary.tests.filter((test) => testNames.includes(test.name)).map(toTestCaseResult);

		onProgress({ phase: "parsing", lastLine: `${tests.length} test(s) reported` });

		if (tests.length === 0) return fallBack("Full build: the open editor does not know this quest's tests yet.");
		if (signal.aborted) return finish({ compiled: true, compilerOutput, error: "Cancelled." });

		return finish({ compiled: true, compilerOutput, tests });
	}

	/** Calls CompileLiveCoding; a tool error (such as "not available") is read like any other answer. */
	private async compile(): Promise<ReturnType<typeof readLiveCodingAnswer>>
	{
		try
		{
			return readLiveCodingAnswer(await this.dependencies.session.client.compileLiveCoding());
		}
		catch (error)
		{
			if (error instanceof EditorClientError && error.kind === "tool") return readLiveCodingAnswer(error.message);

			throw error;
		}
	}
}

/** Maps one editor test to the shared result shape. */
function toTestCaseResult(test: EditorTestCase): TestCaseResult
{
	const result: TestCaseResult = { name: test.name, passed: PASSING_STATES.has(test.state.toLowerCase()) };

	if (test.errors[0] !== undefined) result.message = test.errors[0];
	if (test.durationSeconds !== undefined) result.durationMs = Math.round(test.durationSeconds * 1000);

	return result;
}
