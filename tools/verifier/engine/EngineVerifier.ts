// The `--engine` stage: builds every reference solution (bosses included) in a sandbox copy, runs its tests, and checks starters fail.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { declaredTestNames } from "../../../src/main/services/unreal/TestFilter";
import type { ContentProblem } from "../../../src/shared/types/content";
import { readBossSolution } from "../bossSolution";
import { errorAt } from "../checks/checkHelpers";
import type { QuestRecord } from "../ContentCheck";

import { EngineSandbox, type EngineTarget, type SandboxBuild, type SandboxFile, type SandboxTestRun } from "./EngineSandbox";

/** A quest ready for the engine: what QuestFileWriter needs, the solution files, the starter (none for a boss), and declared test names. */
interface EngineQuest
{
	quest: { id: string; title: string; tests: string };
	file: string;
	solution: SandboxFile[];

	/** Build and refactor quests only; a boss has no starter to check (A67). */
	starter?: SandboxFile[];

	/** Bosses only: extended files of piece quests that replace those files while the boss is built (A215). */
	overrides?: Map<string, SandboxFile[]>;
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
	writeQuest(quest: { id: string; title: string; tests: string }, files: readonly SandboxFile[]): Promise<void>;
	removeQuest(questId: string): Promise<void>;
	build(): Promise<SandboxBuild>;
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
function buildErrors(result: SandboxBuild, questId?: string): string[]
{
	const errors = result.lines.filter((line) => BUILD_ERROR_PATTERN.test(line) && !/\b0 error/i.test(line));

	// Windows compilers print backslashes; compare with forward slashes on every platform.
	const scoped = questId === undefined ? errors : errors.filter((line) => { const path = line.replace(/\\/g, "/"); return path.includes(`Quests/${questId}/`) || path.includes(`Tests/${questId}.Test.cpp`); });

	return scoped.slice(0, MAXIMUM_QUOTED_LINES).map((line) => line.trim());
}

/** A warning that a starter check could not reach a verdict. */
function inconclusive(file: string, reason: string): ContentProblem
{
	return { ...errorAt(file, `starter check inconclusive: ${reason}`, "engine"), severity: "warning" };
}

/** Reads a build or refactor quest's solution; undefined when a file is missing (the solution check reports it). */
async function codeQuestEntry(quest: QuestRecord["quest"] & { kind: "build" | "refactor" }, file: string, solutionsFolder: string): Promise<EngineQuest | undefined>
{
	const solution: SandboxFile[] = [];

	for (const questFile of quest.files)
	{
		const text = await readFile(join(solutionsFolder, quest.id, questFile.name), "utf8").catch(() => undefined);

		if (text !== undefined) solution.push({ name: questFile.name, text });
	}

	if (solution.length !== quest.files.length) return undefined;

	const starter = quest.files.map((questFile) => ({ name: questFile.name, text: questFile.starter }));

	return { quest: { id: quest.id, title: quest.title, tests: quest.tests }, file, solution, starter, testNames: declaredTestNames(quest.tests) };
}

/** Reads a boss's reference integration: its code files become the quest files, its `*.Test.cpp` files the tests (A67, A215). */
async function bossEntry(quest: QuestRecord["quest"] & { kind: "boss" }, file: string, solutionsFolder: string): Promise<EngineQuest | undefined>
{
	const integration = await readBossSolution(solutionsFolder, quest.id);

	if (integration === undefined || integration.code.length === 0) return undefined;

	const tests = integration.tests.map((testFile) => testFile.text).join("\n");

	return { quest: { id: quest.id, title: quest.title, tests }, file, solution: integration.code, overrides: integration.overrides, testNames: declaredTestNames(tests) };
}

/** Turns quest records into engine quests, reading each reference solution; quests without one are skipped (the solution check reports them). */
async function engineQuests(records: readonly QuestRecord[], solutionsFolder: string): Promise<{ quests: EngineQuest[]; problems: ContentProblem[] }>
{
	const quests: EngineQuest[] = [];
	const problems: ContentProblem[] = [];

	for (const { quest, file } of records)
	{
		let entry: EngineQuest | undefined;

		if (quest.kind === "build" || quest.kind === "refactor") entry = await codeQuestEntry(quest, file, solutionsFolder);
		else if (quest.kind === "boss") entry = await bossEntry(quest, file, solutionsFolder);

		if (entry === undefined) continue;

		if (entry.testNames.length === 0)
		{
			problems.push(errorAt(file, "no IMPLEMENT_SIMPLE_AUTOMATION_TEST found, so the engine has nothing to run", quest.kind === "boss" ? "engine" : "Tests"));
			continue;
		}

		quests.push(entry);
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

		for (const entry of quests) await sandbox.writeQuest(entry.quest, entry.solution);

		const overridden = await this.writeBossOverrides(sandbox, quests);

		log(`engine: building ${quests.length} reference solutions`);

		const buildStarted = performance.now();
		const build = await sandbox.build();

		timings.firstBuildSeconds = secondsSince(buildStarted);

		if (!build.succeeded)
		{
			const general = build.pipelineError === undefined ? buildErrors(build) : [build.pipelineError];

			for (const entry of judged)
			{
				const own = buildErrors(build, entry.quest.id);
				const quoted = own.length > 0 ? own : general;

				problems.push(errorAt(entry.file, `the reference solution did not build${quoted.length > 0 ? `:\n${quoted.join("\n")}` : ""}`, "engine"));
			}

			return { problems, questsChecked: judged.length, timings, keptSandbox: sandbox.folder };
		}

		log(`engine: running the tests of ${judged.length} quests headless`);

		const testsStarted = performance.now();
		const run = await sandbox.runTests(judged.flatMap((entry) => entry.testNames));

		timings.solutionTestsSeconds = secondsSince(testsStarted);

		const solutionFailed = new Set<string>();

		for (const entry of judged)
		{
			const found = this.judgeSolution(entry, run);

			if (found.length > 0) solutionFailed.add(entry.quest.id);

			problems.push(...found);
		}

		const startersStarted = performance.now();

		// Starters are judged without bosses: a boss calls members its piece overrides add, so a piece starter would always break it.
		await this.removeBosses(sandbox, quests, overridden);

		for (const entry of judged)
		{
			// A starter can only be judged against a solution that passes; otherwise "the starter fails" proves nothing.
			if (entry.starter === undefined) continue;

			if (solutionFailed.has(entry.quest.id)) problems.push(inconclusive(entry.file, "the reference solution fails, so the starter was not checked"));
			else problems.push(...(await this.checkStarter(sandbox, entry)));
		}

		timings.starterChecksSeconds = secondsSince(startersStarted);

		const failed = problems.some((problem) => problem.severity !== "warning");

		if (failed) return { problems, questsChecked: judged.length, timings, keptSandbox: sandbox.folder };

		await sandbox.remove();

		return { problems, questsChecked: judged.length, timings };
	}

	/** Writes each boss's piece overrides over those pieces' solutions (override files replace same-named files). Returns the overridden piece ids. */
	private async writeBossOverrides(sandbox: VerifierSandbox, quests: readonly EngineQuest[]): Promise<Set<string>>
	{
		const byId = new Map(quests.map((entry) => [entry.quest.id, entry]));
		const overridden = new Set<string>();

		for (const entry of quests)
		{
			for (const [pieceId, files] of entry.overrides ?? [])
			{
				const piece = byId.get(pieceId);

				if (piece === undefined) continue;

				const merged = new Map(piece.solution.map((file) => [file.name, file]));

				for (const file of files) merged.set(file.name, file);

				await sandbox.writeQuest(piece.quest, [...merged.values()]);
				overridden.add(pieceId);
			}
		}

		return overridden;
	}

	/** Takes every boss out of the sandbox and puts overridden pieces back on their own solutions. */
	private async removeBosses(sandbox: VerifierSandbox, quests: readonly EngineQuest[], overridden: ReadonlySet<string>): Promise<void>
	{
		for (const entry of quests)
		{
			if (entry.starter === undefined) await sandbox.removeQuest(entry.quest.id);
			else if (overridden.has(entry.quest.id)) await sandbox.writeQuest(entry.quest, entry.solution);
		}
	}

	/** Every declared test of a quest must appear in the report and pass. */
	private judgeSolution(entry: EngineQuest, run: SandboxTestRun): ContentProblem[]
	{
		const outcomes = run.outcomes;

		if (outcomes === undefined) return [errorAt(entry.file, `the headless test run gave no results: ${run.pipelineError ?? "no report"}`, "engine")];

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
		const starter = entry.starter ?? [];

		log(`engine: starter check ${entry.quest.id}`);

		await sandbox.writeQuest(entry.quest, starter);

		const build = await sandbox.build();

		// A starter that does not compile is fine only when the errors are in its own files; anything else means it broke other quests' code.
		if (!build.succeeded && buildErrors(build, entry.quest.id).length === 0)
		{
			problems.push(inconclusive(entry.file, "the starter broke other quests' code (no build error points into its own files)"));
		}

		if (build.succeeded)
		{
			const run = await sandbox.runTests(entry.testNames);
			const outcomes = entry.testNames.map((name) => run.outcomes?.get(name));

			if (run.outcomes === undefined || outcomes.some((outcome) => outcome === undefined))
			{
				problems.push(inconclusive(entry.file, "the starter built but its tests did not all run"));
			}
			else if (outcomes.every((outcome) => outcome?.passed === true))
			{
				problems.push(errorAt(entry.file, "the starter already passes its tests; the learner would have nothing to do", "engine"));
			}
		}

		await sandbox.writeQuest(entry.quest, entry.solution);

		return problems;
	}
}
