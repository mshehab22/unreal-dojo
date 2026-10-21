// The `--engine` stage: builds every reference solution in a sandbox copy, runs its tests, and checks starters fail.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { BuildQuest, ContentProblem, RefactorQuest } from "../../../src/shared/types/content";
import type { QuestRecord } from "../ContentCheck";
import { errorAt } from "../checks/checkHelpers";

import { EngineSandbox, type EngineTarget, type SandboxFile, type SandboxTestRun } from "./EngineSandbox";
import type { ProcessResult } from "./runProcess";
import { testNamesIn } from "./testNamesIn";

/** A build or refactor quest ready for the engine: its file, solution files, and declared test names. */
interface EngineQuest
{
	quest: BuildQuest | RefactorQuest;
	file: string;
	solution: SandboxFile[];
	testNames: string[];
}

/** Seconds spent in each step, for the report and the docs. */
export interface EngineTimings
{
	firstBuildSeconds: number;
	solutionTestsSeconds: number;
	starterChecksSeconds: number;
}

/** What the engine stage found. */
export interface EngineReport
{
	problems: ContentProblem[];
	questsChecked: number;
	timings: EngineTimings;

	/** The sandbox copy, kept when anything failed so it can be inspected; undefined when it was removed. */
	keptSandbox?: string;
}

/** The sandbox operations the verifier uses; `EngineSandbox` is the real one, tests pass a fake. */
export interface VerifierSandbox
{
	readonly folder: string;
	writeQuestFiles(questId: string, files: readonly SandboxFile[]): Promise<void>;
	writeQuestTests(questId: string, source: string): Promise<void>;
	build(): Promise<ProcessResult>;
	runTests(testNames: readonly string[]): Promise<SandboxTestRun>;
	remove(): Promise<void>;
}

/** Where the verifier reads from and how it talks. */
export interface EngineVerifierOptions
{
	target: EngineTarget;
	templateFolder: string;
	solutionsFolder: string;

	/** Progress lines (the CLI prints them to stderr). */
	log: (line: string) => void;

	/** Makes the sandbox; defaults to a real copy of the template. */
	createSandbox?: (templateFolder: string, target: EngineTarget) => Promise<VerifierSandbox>;
}

/** Build output lines worth showing: compiler errors and the failure summary. */
const BUILD_ERROR_PATTERN = /(?:\berror\b|Result: Failed|BUILD FAILED)/i;

/** Most build error lines quoted per quest. */
const MAXIMUM_QUOTED_LINES = 8;

/** Seconds since `started`, one decimal. */
function secondsSince(started: number): number
{
	return Math.round((performance.now() - started) / 100) / 10;
}

/** Build error lines; when `questId` is given, only the lines that point into that quest's code or tests. */
function buildErrors(result: ProcessResult, questId?: string): string[]
{
	const errors = result.lines.filter((line) => BUILD_ERROR_PATTERN.test(line) && !/\b0 error/i.test(line));
	const scoped = questId === undefined ? errors : errors.filter((line) => line.includes(`Quests/${questId}/`) || line.includes(`Tests/${questId}.Test.cpp`));

	return scoped.slice(0, MAXIMUM_QUOTED_LINES).map((line) => line.trim());
}

/** Turns quest records into engine quests, reading each reference solution; quests without one are skipped (the solution check reports them). */
async function engineQuests(records: readonly QuestRecord[], solutionsFolder: string): Promise<{ quests: EngineQuest[]; problems: ContentProblem[] }>
{
	const quests: EngineQuest[] = [];
	const problems: ContentProblem[] = [];

	for (const { quest, file } of records)
	{
		if (quest.kind !== "build" && quest.kind !== "refactor") continue;

		const solution: SandboxFile[] = [];

		for (const questFile of quest.files)
		{
			const text = await readFile(join(solutionsFolder, quest.id, questFile.name), "utf8").catch(() => undefined);

			if (text !== undefined) solution.push({ name: questFile.name, text });
		}

		if (solution.length !== quest.files.length) continue;

		const testNames = testNamesIn(quest.tests);

		if (testNames.length === 0)
		{
			problems.push(errorAt(file, "no IMPLEMENT_SIMPLE_AUTOMATION_TEST found, so the engine has nothing to run", "Tests"));
			continue;
		}

		quests.push({ quest, file, solution, testNames });
	}

	return { quests, problems };
}

/** Runs the engine stage for the given quests. Never throws for content problems; engine failures become problems too. */
export class EngineVerifier
{
	private readonly options: EngineVerifierOptions;

	/** Keeps the options; nothing runs until `verify`. */
	constructor(options: EngineVerifierOptions)
	{
		this.options = options;
	}

	/**
	 * 1. Copy the sandbox template and write every reference solution and its tests.
	 * 2. Build once and run every quest's tests headless; each declared test must run and pass.
	 * 3. For each quest in turn, swap in its starter files, build, and run its tests: they must not all pass
	 *    (a starter that does not compile is fine). Then put the solution back.
	 * Every solution is always written (quests may use each other's classes); `scope` limits which quests are judged.
	 */
	async verify(records: readonly QuestRecord[], scope?: ReadonlySet<string>): Promise<EngineReport>
	{
		const { log } = this.options;
		const timings: EngineTimings = { firstBuildSeconds: 0, solutionTestsSeconds: 0, starterChecksSeconds: 0 };
		const { quests, problems } = await engineQuests(records, this.options.solutionsFolder);

		const judged = quests.filter((entry) => scope === undefined || scope.has(entry.quest.id));

		if (judged.length === 0) return { problems, questsChecked: 0, timings };

		const createSandbox = this.options.createSandbox ?? ((templateFolder, target) => EngineSandbox.create(templateFolder, target));
		const sandbox = await createSandbox(this.options.templateFolder, this.options.target);

		log(`engine: sandbox copy at ${sandbox.folder}`);

		for (const entry of quests)
		{
			await sandbox.writeQuestFiles(entry.quest.id, entry.solution);
			await sandbox.writeQuestTests(entry.quest.id, entry.quest.tests);
		}

		log(`engine: building ${quests.length} reference solutions`);

		const buildStarted = performance.now();
		const build = await sandbox.build();

		timings.firstBuildSeconds = secondsSince(buildStarted);

		if (build.exitCode !== 0)
		{
			const general = buildErrors(build);

			for (const entry of judged)
			{
				const own = buildErrors(build, entry.quest.id);
				const quoted = own.length > 0 ? own : general;

				problems.push(errorAt(entry.file, `the reference solution did not build${build.timedOut ? " (timed out)" : ""}${quoted.length > 0 ? `:\n${quoted.join("\n")}` : ""}`, "engine"));
			}

			return { problems, questsChecked: judged.length, timings, keptSandbox: sandbox.folder };
		}

		log(`engine: running the tests of ${judged.length} quests headless`);

		const testsStarted = performance.now();
		const run = await sandbox.runTests(judged.flatMap((entry) => entry.testNames));

		timings.solutionTestsSeconds = secondsSince(testsStarted);

		for (const entry of judged) problems.push(...this.judgeSolution(entry, run.outcomes));

		const startersStarted = performance.now();

		for (const entry of judged) problems.push(...(await this.checkStarter(sandbox, entry)));

		timings.starterChecksSeconds = secondsSince(startersStarted);

		const failed = problems.some((problem) => problem.severity !== "warning");

		if (failed) return { problems, questsChecked: judged.length, timings, keptSandbox: sandbox.folder };

		await sandbox.remove();

		return { problems, questsChecked: judged.length, timings };
	}

	/** Every declared test of a quest must appear in the report and pass. */
	private judgeSolution(entry: EngineQuest, outcomes: Map<string, { passed: boolean; state: string; messages: string[] }> | undefined): ContentProblem[]
	{
		if (outcomes === undefined) return [errorAt(entry.file, "the headless test run wrote no report", "engine")];

		const problems: ContentProblem[] = [];

		for (const name of entry.testNames)
		{
			const outcome = outcomes.get(name);

			if (outcome === undefined) problems.push(errorAt(entry.file, `test ${name} did not run with the reference solution`, "engine"));
			else if (!outcome.passed) problems.push(errorAt(entry.file, `test ${name} fails with the reference solution (${outcome.state})${outcome.messages.length > 0 ? `:\n${outcome.messages.join("\n")}` : ""}`, "engine"));
		}

		return problems;
	}

	/** Swaps in the starter, builds, runs the quest's tests, reports a starter that already passes, and restores the solution. */
	private async checkStarter(sandbox: VerifierSandbox, entry: EngineQuest): Promise<ContentProblem[]>
	{
		const { log } = this.options;
		const problems: ContentProblem[] = [];
		const starter = entry.quest.files.map((questFile) => ({ name: questFile.name, text: questFile.starter }));

		log(`engine: starter check ${entry.quest.id}`);

		await sandbox.writeQuestFiles(entry.quest.id, starter);

		const build = await sandbox.build();

		if (build.exitCode === 0)
		{
			const run = await sandbox.runTests(entry.testNames);
			const outcomes = entry.testNames.map((name) => run.outcomes?.get(name));

			if (run.outcomes === undefined || outcomes.some((outcome) => outcome === undefined))
			{
				problems.push({ ...errorAt(entry.file, "starter check inconclusive: the starter built but its tests did not all run", "engine"), severity: "warning" });
			}
			else if (outcomes.every((outcome) => outcome?.passed === true))
			{
				problems.push(errorAt(entry.file, "the starter already passes its tests; the learner would have nothing to do", "engine"));
			}
		}

		await sandbox.writeQuestFiles(entry.quest.id, entry.solution);

		return problems;
	}
}
