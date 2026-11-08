// The `--engine` stage: builds every reference solution (bosses included) in a persistent sandbox workspace, runs its tests, and checks starters fail.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { declaredTestNames } from "../../../src/main/services/unreal/TestFilter";
import type { ContentProblem } from "../../../src/shared/types/content";
import { readBossSolution } from "../../../src/main/services/unreal/bossSolution";
import { declaredDependencyIds } from "../checks/dependencyCheck";
import { errorAt } from "../checks/checkHelpers";
import type { QuestRecord } from "../ContentCheck";

import { EngineSandbox, type EngineTarget, type SandboxBuild, type SandboxFile, type SandboxTestRun } from "./EngineSandbox";

/** A quest ready for the engine: what QuestFileWriter needs, the solution files, the starter (none for a boss), and declared test names. */
export interface EngineQuest
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
export interface InstalledQuest
{
	quest: EngineQuest["quest"];
	files: SandboxFile[];
}

/** Every quest a record needs before it: its prerequisites, the quests its "Compiles against earlier quests:" line names, and a boss's pieces. */
export function directRequirements(record: QuestRecord): string[]
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

	/** Building and testing the quests whose learner sandbox differs from the shared build's (A2040); zero when there are none. */
	ownSolutionChecksSeconds: number;
	solutionTestsSeconds: number;
	starterChecksSeconds: number;
}

/** What the engine stage found. */
export interface EngineReport
{
	problems: ContentProblem[];
	questsChecked: number;
	timings: EngineTimings;

	/** This run's build and test logs, inside the persistent workspace (the last few runs are kept); undefined when no workspace was used. */
	logsFolder?: string;

	/** True when the run was interrupted (Ctrl+C or SIGTERM) before it finished. */
	cancelled?: boolean;
}

/** The sandbox operations the verifier uses; `EngineSandbox` is the real one, tests pass a fake. */
export interface VerifierSandbox
{
	readonly folder: string;

	/** Where this run's logs are written. */
	readonly logsFolder: string;
	writeQuest(quest: { id: string; title: string; tests: string }, files: readonly SandboxFile[]): Promise<void>;
	removeQuest(questId: string): Promise<void>;
	build(): Promise<SandboxBuild>;
	runTests(testNames: readonly string[]): Promise<SandboxTestRun>;

	/** Ends the run's use of the workspace (releases its lock); build outputs stay. Called on every exit path. */
	release(): Promise<void>;
}

/** Where the verifier reads from and how it talks. */
export interface EngineVerifierOptions
{
	target: EngineTarget;
	templateFolder: string;
	solutionsFolder: string;

	/** Progress lines (the CLI prints them to stderr). */
	log: (line: string) => void;

	/** Makes the sandbox; defaults to the persistent workspace for the engine version. */
	createSandbox?: (templateFolder: string, target: EngineTarget, signal: AbortSignal) => Promise<VerifierSandbox>;

	/** The folder that holds the persistent workspaces (see `resolveWorkspaceRoot`); only the default `createSandbox` uses it. */
	workspaceRoot?: string;

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
export async function engineQuests(records: readonly QuestRecord[], solutionsFolder: string): Promise<{ quests: EngineQuest[]; problems: ContentProblem[] }>
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

/** Quests whose own tests can run together in one sandbox state, and that state. */
export interface OwnStateGroup
{
	members: EngineQuest[];
	desired: Map<string, InstalledQuest>;
}

/** Whether quest `questId` has exactly the same files in the `own` state as in the `shared` one. */
function sameFilesInBoth(questId: string, own: ReadonlyMap<string, InstalledQuest>, shared: ReadonlyMap<string, InstalledQuest>): boolean
{
	const inOwn = own.get(questId);
	const inShared = shared.get(questId);

	return inOwn !== undefined && inShared !== undefined && fingerprint(inOwn.files) === fingerprint(inShared.files);
}

/** Whether two states never give one quest two different sets of files, so they can be one sandbox. */
function compatible(first: ReadonlyMap<string, InstalledQuest>, second: ReadonlyMap<string, InstalledQuest>): boolean
{
	for (const [id, entry] of second)
	{
		const other = first.get(id);

		if (other !== undefined && fingerprint(other.files) !== fingerprint(entry.files)) return false;
	}

	return true;
}

/**
 * The extra sandbox states the judged quests' own tests need (A2040). The shared first build holds every solution with every
 * boss's piece copies over the pieces, so a piece's tests there run against the boss's copy and a mistake in the piece's own
 * solution goes unseen. A quest's tests must also run against what its learner has: its own solution, the solutions of what it
 * needs, and the piece copies of only the bosses it needs. Only a quest whose own files differ between that state and the shared one
 * (a piece a later boss carries its own copy of) is tested again; a quest that merely uses such a piece keeps its shared-build
 * verdict, because the boss copies only extend what dependents call (A2040). Quests whose states never give one quest two
 * different file sets share a group, so the extra builds are a handful, not one per piece.
 */
export function ownStateGroups(quests: readonly EngineQuest[], judged: readonly EngineQuest[], requirementsOf: ReadonlyMap<string, readonly string[]>): OwnStateGroup[]
{
	const shared = desiredState(quests, new Set(quests.map((entry) => entry.quest.id)));
	const groups: OwnStateGroup[] = [];

	for (const entry of judged)
	{
		const needed = requirementClosure(entry.quest.id, requirementsOf);
		const own = desiredState(quests, new Set([...needed, entry.quest.id]));

		if (sameFilesInBoth(entry.quest.id, own, shared)) continue;

		const group = groups.find((candidate) => compatible(candidate.desired, own));

		if (group === undefined)
		{
			groups.push({ members: [entry], desired: new Map(own) });
		}
		else
		{
			group.members.push(entry);

			for (const [id, state] of own) group.desired.set(id, state);
		}
	}

	return groups;
}

/** The error for an engine run that built and tested no quest, so a mistyped path or id never looks like a pass. */
function nothingJudgedMessage(scope: ReadonlySet<string> | undefined, solutionsFolder: string): string
{
	const ids = scope === undefined ? [] : [...scope];
	const scoped = ids.length === 0 ? "" : ` for ${ids.slice(0, 5).join(", ")}${ids.length > 5 ? ", and more" : ""}`;

	return `the engine stage judged no quests: no reference solution was found${scoped} in ${solutionsFolder}; check the --solutions path, the --quest or --pack id, and that each quest has a folder there`;
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
	 * 0. Take the persistent workspace for the engine version (waiting if another run holds it) and bring it to the template's state.
	 *    Whatever way the run ends, the lock is released and nothing is left in the temp folder.
	 * 1. Write every reference solution and its tests.
	 * 2. Build once and run every quest's tests headless; each declared test must run and pass.
	 * 3. For each quest in turn, swap in its starter files, build, and run its tests: they must not all pass
	 *    (a starter that does not compile is fine). Then put the solution back.
	 * Every solution is always written (quests may use each other's classes); `scope` limits which quests are judged.
	 */
	async verify(records: readonly QuestRecord[], scope?: ReadonlySet<string>): Promise<EngineReport>
	{
		const { log } = this.options;
		const timings: EngineTimings = { firstBuildSeconds: 0, ownSolutionChecksSeconds: 0, solutionTestsSeconds: 0, starterChecksSeconds: 0 };
		const { quests, problems } = await engineQuests(records, this.options.solutionsFolder);

		const judged = quests.filter((entry) => scope === undefined || scope.has(entry.quest.id));

		// Judging nothing is a failure of its own, unless a quest was already reported as unusable (that report fails the run).
		if (judged.length === 0) return { problems: problems.length > 0 ? problems : [errorAt("(engine)", nothingJudgedMessage(scope, this.options.solutionsFolder))], questsChecked: 0, timings };

		const signal = this.options.signal ?? new AbortController().signal;
		const createSandbox = this.options.createSandbox ?? ((templateFolder, target, abortSignal) => EngineSandbox.create(templateFolder, target, { signal: abortSignal, log, ...(this.options.workspaceRoot === undefined ? {} : { workspaceRoot: this.options.workspaceRoot }) }));
		let sandbox: VerifierSandbox;

		try
		{
			sandbox = await createSandbox(this.options.templateFolder, this.options.target, signal);
		}
		catch (error)
		{
			const reason = error instanceof Error ? error.message : String(error);

			return { problems: [...problems, errorAt("(engine)", signal.aborted ? reason : `could not prepare the verify workspace: ${reason}`)], questsChecked: judged.length, timings, ...(signal.aborted ? { cancelled: true } : {}) };
		}

		// The workspace is shared, so its lock is released on every way out: a pass, a failure, a cancel, and a thrown error.
		try
		{
			return await this.verifyInWorkspace(sandbox, records, quests, judged, problems, timings, signal);
		}
		finally
		{
			await sandbox.release().catch((error: unknown) => log(`engine: could not release the verify workspace: ${error instanceof Error ? error.message : String(error)}`));
		}
	}

	/** Steps 1 to 3 of `verify` inside a workspace this run holds. */
	private async verifyInWorkspace(sandbox: VerifierSandbox, records: readonly QuestRecord[], quests: readonly EngineQuest[], judged: readonly EngineQuest[], problems: ContentProblem[], timings: EngineTimings, signal: AbortSignal): Promise<EngineReport>
	{
		const { log } = this.options;

		/** The report for a run interrupted at `step`: what was found so far, plus one problem saying it stopped. */
		const stopped = (step: string): EngineReport => ({
			problems: [...problems, errorAt("(engine)", `cancelled during ${step}; this run's logs are in ${sandbox.logsFolder}`)],
			questsChecked: judged.length,
			timings,
			logsFolder: sandbox.logsFolder,
			cancelled: true,
		});

		log(`engine: verify workspace at ${sandbox.folder}`);

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

			return { problems, questsChecked: judged.length, timings, logsFolder: sandbox.logsFolder };
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

		// A quest whose learner would have a different version of a piece than the shared build holds is tested again in its own sandbox (A2040).
		const ownStartedAt = performance.now();

		for (const group of ownStateGroups(quests, judged, requirementsOf))
		{
			if (signal.aborted) return stopped("the own-solution checks");

			log(`engine: own-solution check of ${group.members.map((member) => member.quest.id).join(", ")}`);

			await install(sandbox, group.desired, installed);

			const groupBuild = await sandbox.build();

			if (signal.aborted) return stopped("the own-solution checks");

			if (!groupBuild.succeeded)
			{
				for (const member of group.members)
				{
					const quoted = buildErrors(groupBuild, member.quest.id);

					solutionFailed.add(member.quest.id);
					problems.push(errorAt(member.file, `the reference solution did not build in the sandbox a learner has at this quest (the solutions of what it needs, without the boss copies of pieces that come after it)${quoted.length > 0 ? `:\n${quoted.join("\n")}` : ""}`, "engine"));
				}

				continue;
			}

			const groupRun = await sandbox.runTests(group.members.flatMap((member) => member.testNames));

			if (signal.aborted) return stopped("the own-solution checks");

			for (const member of group.members)
			{
				const found = this.judgeSolution(member, groupRun, " in the sandbox a learner has at this quest");

				if (found.length > 0) solutionFailed.add(member.quest.id);

				problems.push(...found);
			}
		}

		timings.ownSolutionChecksSeconds = secondsSince(ownStartedAt);

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

		return { problems, questsChecked: judged.length, timings, logsFolder: sandbox.logsFolder };
	}

	/** Every declared test of a quest must appear in the report and pass; `where` says which sandbox the run used, when it is not the shared one. */
	private judgeSolution(entry: EngineQuest, run: SandboxTestRun, where = ""): ContentProblem[]
	{
		const outcomes = run.outcomes;

		if (outcomes === undefined) return [errorAt(entry.file, `the headless test run gave no results: ${run.pipelineError ?? "no report"}`, "engine")];

		const problems: ContentProblem[] = [];

		for (const name of entry.testNames)
		{
			const outcome = outcomes.get(name);

			if (outcome === undefined) problems.push(errorAt(entry.file, `test ${name} did not run with the reference solution${where}`, "engine"));
			else if (!outcome.passed) problems.push(errorAt(entry.file, `test ${name} fails with the reference solution${where} (${outcome.state})${outcome.messages.length > 0 ? `:\n${outcome.messages.join("\n")}` : ""}`, "engine"));
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
