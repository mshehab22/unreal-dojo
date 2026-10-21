// The `--engine` stage: builds every reference solution (bosses included) in a sandbox copy, runs its tests, and checks starters fail.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { declaredTestNames } from "../../../src/main/services/unreal/TestFilter";
import type { ContentProblem } from "../../../src/shared/types/content";
import { readBossSolution } from "../bossSolution";
import { declaredDependencyIds } from "../checks/dependencyCheck";
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

/** One quest's files as the sandbox should hold them for a step. */
interface InstalledQuest
{
	quest: EngineQuest["quest"];
	files: SandboxFile[];
}

/** Every quest a record needs before it: its prerequisites, the quests its "Compiles against earlier quests:" line names, and a boss's pieces. */
function directRequirements(record: QuestRecord): string[]
{
	const quest = record.quest;
	const prose = quest.kind === "build" || quest.kind === "refactor" ? quest.brief : quest.kind === "boss" ? quest.spec : "";
	const pieces = quest.kind === "boss" ? quest.pieces : [];

	return [...new Set([...quest.prerequisites, ...declaredDependencyIds(prose), ...pieces])];
}

/** Every quest `questId` needs, followed through every kind of quest (a concept prerequisite still leads to the build quests before it). */
function requirementClosure(questId: string, requirementsOf: ReadonlyMap<string, readonly string[]>): Set<string>
{
	const closure = new Set<string>();
	const pending = [...(requirementsOf.get(questId) ?? [])];

	while (pending.length > 0)
	{
		const next = pending.pop() ?? "";

		if (closure.has(next) || next === questId) continue;

		closure.add(next);
		pending.push(...(requirementsOf.get(next) ?? []));
	}

	return closure;
}

/** A short fingerprint of a file set, so unchanged quests are not rewritten (a rewrite would force UBT to recompile them). */
function fingerprint(files: readonly SandboxFile[]): string
{
	return files.map((file) => `${file.name}\u0000${file.text}`).join("\u0001");
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

	/** True when the run was interrupted (Ctrl+C or SIGTERM) before it finished. */
	cancelled?: boolean;
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
	createSandbox?: (templateFolder: string, target: EngineTarget, signal: AbortSignal) => Promise<VerifierSandbox>;

	/** Aborting stops the run: the builder and test runner kill their process trees, and no further step starts. */
	signal?: AbortSignal;
}

/** Build output lines worth showing: compiler errors and the failure summary. */
const BUILD_ERROR_PATTERN = /(?:\berror\b|Result: Failed|BUILD FAILED)/i;

/** Build error lines quoted in an inconclusive starter check. */
const QUOTED_INCONCLUSIVE_LINES = 3;

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

/**
 * The sandbox contents for one step: every engine quest in `included` on its solution, with the piece overrides of every
 * included boss applied over those pieces, and `starterFor` (when given) on its starter instead.
 */
function desiredState(quests: readonly EngineQuest[], included: ReadonlySet<string>, starterFor?: EngineQuest): Map<string, InstalledQuest>
{
	const desired = new Map<string, InstalledQuest>();

	for (const entry of quests)
	{
		if (entry === starterFor) desired.set(entry.quest.id, { quest: entry.quest, files: entry.starter ?? [] });
		else if (included.has(entry.quest.id)) desired.set(entry.quest.id, { quest: entry.quest, files: entry.solution });
	}

	for (const entry of quests)
	{
		if (!included.has(entry.quest.id) || entry === starterFor) continue;

		for (const [pieceId, overrideFiles] of entry.overrides ?? [])
		{
			const piece = desired.get(pieceId);

			if (piece === undefined || piece.quest.id === starterFor?.quest.id) continue;

			const merged = new Map(piece.files.map((file) => [file.name, file]));

			for (const file of overrideFiles) merged.set(file.name, file);

			desired.set(pieceId, { quest: piece.quest, files: [...merged.values()] });
		}
	}

	return desired;
}

/** Brings the sandbox to `desired`: removes quests not in it and writes only quests whose files changed, tracking what is in place in `installed`. */
async function install(sandbox: VerifierSandbox, desired: ReadonlyMap<string, InstalledQuest>, installed: Map<string, string>): Promise<void>
{
	for (const id of [...installed.keys()])
	{
		if (desired.has(id)) continue;

		await sandbox.removeQuest(id);
		installed.delete(id);
	}

	for (const [id, entry] of desired)
	{
		const print = fingerprint(entry.files);

		if (installed.get(id) === print) continue;

		await sandbox.writeQuest(entry.quest, entry.files);
		installed.set(id, print);
	}
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

		const signal = this.options.signal ?? new AbortController().signal;
		const createSandbox = this.options.createSandbox ?? ((templateFolder, target, abortSignal) => EngineSandbox.create(templateFolder, target, abortSignal));
		const sandbox = await createSandbox(this.options.templateFolder, this.options.target, signal);

		/** The report for a run interrupted at `step`: what was found so far, plus one problem saying it stopped. */
		const stopped = (step: string): EngineReport => ({
			problems: [...problems, errorAt("(engine)", `cancelled during ${step}; the sandbox copy is kept at ${sandbox.folder}`)],
			questsChecked: judged.length,
			timings,
			keptSandbox: sandbox.folder,
			cancelled: true,
		});

		log(`engine: sandbox copy at ${sandbox.folder}`);

		// Every solution goes in, with every boss's piece overrides over its pieces' solutions (A215).
		const installed = new Map<string, string>();
		const requirementsOf = new Map(records.map((record) => [record.quest.id, directRequirements(record)]));

		await install(sandbox, desiredState(quests, new Set(quests.map((entry) => entry.quest.id))), installed);

		log(`engine: building ${quests.length} reference solutions`);

		const buildStarted = performance.now();
		const build = await sandbox.build();

		timings.firstBuildSeconds = secondsSince(buildStarted);

		if (signal.aborted) return stopped("the first build");

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

		if (signal.aborted) return stopped("the solution tests");

		const solutionFailed = new Set<string>();

		for (const entry of judged)
		{
			const found = this.judgeSolution(entry, run);

			if (found.length > 0) solutionFailed.add(entry.quest.id);

			problems.push(...found);
		}

		const startersStarted = performance.now();


		for (const entry of judged)
		{
			// A starter can only be judged against a solution that passes; otherwise "the starter fails" proves nothing.
			if (entry.starter === undefined) continue;
			if (signal.aborted) return stopped(`the starter checks (before ${entry.quest.id})`);

			if (solutionFailed.has(entry.quest.id)) problems.push(inconclusive(entry.file, "the reference solution fails, so the starter was not checked"));
			else
			{
				// The sandbox holds what a learner has at this quest (A443): its starter, the solutions of everything it needs,
				// and the piece overrides of any boss it needs; later quests and unneeded bosses are taken out.
				const needed = requirementClosure(entry.quest.id, requirementsOf);

				await install(sandbox, desiredState(quests, needed, entry), installed);
				problems.push(...(await this.checkStarter(sandbox, entry)));
			}
		}

		timings.starterChecksSeconds = secondsSince(startersStarted);

		if (signal.aborted) return stopped("the last starter check");

		// An inconclusive starter check also keeps the sandbox, so its build log in Saved/VerifierLogs can be read.
		const failed = problems.some((problem) => problem.severity !== "warning" || problem.message.startsWith("starter check inconclusive"));

		if (failed) return { problems, questsChecked: judged.length, timings, keptSandbox: sandbox.folder };

		await sandbox.remove();

		return { problems, questsChecked: judged.length, timings };
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

	/** Builds with the quest's starter in place (see `desiredState`), runs its tests, and reports a starter that already passes. */
	private async checkStarter(sandbox: VerifierSandbox, entry: EngineQuest): Promise<ContentProblem[]>
	{
		const { log } = this.options;
		const problems: ContentProblem[] = [];
		log(`engine: starter check ${entry.quest.id}`);

		const build = await sandbox.build();

		// A starter that does not compile is fine only when the errors are in its own files; anything else means it broke other quests' code.
		if (!build.succeeded && buildErrors(build, entry.quest.id).length === 0)
		{
			// Quote the first errors so the reason is visible even after the sandbox is gone.
			const quoted = buildErrors(build).slice(0, QUOTED_INCONCLUSIVE_LINES);

			problems.push(inconclusive(entry.file, `the starter broke other quests' code (no build error points into its own files)${quoted.length > 0 ? `:\n${quoted.join("\n")}` : ""}`));
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

		return problems;
	}
}
