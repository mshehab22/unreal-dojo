// The persistent sandbox project the verifier writes quest code into, then builds and tests through M1.3's runners (A211, A1280, A1321).
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

import type { AutomationTestRunner } from "../../../src/main/services/unreal/AutomationTestRunner";
import type { PlatformPaths } from "../../../src/main/services/unreal/PlatformPaths";
import type { QuestFileWriter, QuestForWriting } from "../../../src/main/services/unreal/QuestFileWriter";
import type { UnrealBuilder } from "../../../src/main/services/unreal/UnrealBuilder";

import { pruneRunLogs } from "./pruneRunLogs";
import { QuestParking, type QuestLocation } from "./QuestParking";
import { syncWorkspace } from "./syncWorkspace";
import { entryNames, QUEST_ID } from "./workspaceEntries";
import { WorkspaceLock, type HeldWorkspaceLock, type WorkspaceLockTuning } from "./WorkspaceLock";
import { resolveWorkspaceRoot, WORKSPACE_ENVIRONMENT_VARIABLE } from "./workspaceLocation";

/**
 * Gap kept between a build finishing and the next write. UBT rebuilds a file only when it is newer than its output,
 * and a file written in the same second as the last compile was skipped on 5.8.3 (seen in M1.8).
 */
const TIMESTAMP_GAP_MILLISECONDS = 1_100;

/** Plugins only 5.8 and later ship; removed from the copy for older engines (A41). */
const PLUGINS_FROM_5_8 = new Set(["ModelContextProtocol", "AutomationTestToolset", "LiveCodingToolset"]);

/** Build products a template may contain on a developer's machine; never copied from it, and never removed from the workspace (A184, A1281). */
const BUILD_OUTPUT_FOLDERS = new Set(["Binaries", "Intermediate", "Saved", "DerivedDataCache"]);

/** Run folders kept under `Saved/VerifierLogs`, the current run included (A1283). */
const KEPT_RUN_LOGS = 5;

/** On Windows a workspace path this long or longer makes builds fail on the 260 character limit; the default is about 50 characters. */
const LONG_WORKSPACE_PATH = 100;

/** Where a build's end time is kept in the workspace, so the gap above also holds between two runs (the next run may start within a second). */
const LAST_BUILD_ENDED_FILE = join("Saved", "LastBuildEnded.txt");

/** Where parked quests wait, outside `Source` so UBT does not see them (A1322). */
const PARKED_FOLDER = join("Saved", "VerifierParked");

/** Waits until the clock is more than the timestamp gap past `moment` (milliseconds since the epoch); never longer than the gap, whatever `moment` says. */
async function waitPast(moment: number): Promise<void>
{
	const remaining = Math.min(TIMESTAMP_GAP_MILLISECONDS, moment + TIMESTAMP_GAP_MILLISECONDS - Date.now());

	if (remaining > 0) await new Promise((done) => setTimeout(done, remaining));
}

/** The quest ids a project folder holds: a folder under `Source/Dojo/Quests` or a `Source/Dojo/Tests/<id>.Test.cpp`. */
async function questIdsIn(projectFolder: string): Promise<Set<string>>
{
	const folders = await entryNames(join(projectFolder, "Source", "Dojo", "Quests"), (entry) => entry.isDirectory());
	const tests = (await entryNames(join(projectFolder, "Source", "Dojo", "Tests"), (entry) => entry.isFile() && entry.name.endsWith(".Test.cpp"))).map((name) => name.slice(0, -".Test.cpp".length));

	return new Set([...folders, ...tests].filter((id) => QUEST_ID.test(id)));
}

/**
 * Whether a workspace path (relative, `/`-separated) belongs to a quest the verifier manages, so the template sync leaves it for
 * the verifier to reuse or remove (A1321): a quest folder, a file directly in it, or a quest's test file. The template's own
 * quests are not included; the sync mirrors them like any template file.
 */
function isQuestPath(path: string, templateQuestIds: ReadonlySet<string>): boolean
{
	const quest = /^Source\/Dojo\/Quests\/([^/]+)(?:\/[^/]+)?$/.exec(path) ?? /^Source\/Dojo\/Tests\/([^/]+)\.Test\.cpp$/.exec(path);
	const id = quest?.[1];

	return id !== undefined && QUEST_ID.test(id) && !templateQuestIds.has(id);
}

/** A sortable, file-name-safe stamp for the run's log folder. */
function runStamp(): string
{
	return new Date().toISOString().replace(/[-:]/g, "").replace(".", "");
}

/** The app's Unreal services the sandbox drives: the same builder, test runner, and file writer the Build screen uses (A211). */
export interface UnrealTools
{
	paths: PlatformPaths;
	builder: UnrealBuilder;
	testRunner: AutomationTestRunner;
	writer: QuestFileWriter;
}

/** Which engine to drive and the tools to drive it with. */
export interface EngineTarget
{
	/** Engine root (the folder that contains `Engine/`). */
	root: string;

	/** For example `5.8.3`. */
	version: string;
	tools: UnrealTools;
}

/** One file to place in a quest folder. */
export interface SandboxFile
{
	name: string;
	text: string;
}

/** The result of one build. */
export interface SandboxBuild
{
	succeeded: boolean;

	/** The builder's filtered output (errors, warnings, quest and test lines), one entry per line. */
	lines: string[];

	/** Why the build program itself failed (could not start, timed out), separate from compile errors. */
	pipelineError?: string;
}

/** The outcome of one test. */
export interface SandboxTestOutcome
{
	passed: boolean;
	state: string;
	messages: string[];
}

/** The result of one headless test run. */
export interface SandboxTestRun
{
	/** Outcome per full test name, or undefined when the run produced no usable report. */
	outcomes: Map<string, SandboxTestOutcome> | undefined;

	/** Why the run produced no results, when it did not. */
	pipelineError?: string;
}

/** Where the sandbox lives and how it waits for it. */
export interface SandboxCreateOptions
{
	/** Aborting kills a running build or test run, and ends a wait for the workspace lock. */
	signal?: AbortSignal;

	/** The folder that holds one workspace per engine version; defaults to the per-user cache folder (`--workspace`, `DOJO_VERIFY_WORKSPACE`). */
	workspaceRoot?: string;
	log?: (line: string) => void;

	/** Lock timing, for tests. */
	lock?: Partial<WorkspaceLockTuning>;
}

/**
 * Owns one run's use of a persistent sandbox project (one per engine version, kept between runs so builds are incremental).
 * Create it with `EngineSandbox.create`, which holds the workspace lock, and `release()` it in a `finally`.
 */
export class EngineSandbox
{
	readonly folder: string;

	/** This run's build and test logs, inside the workspace (`Saved/VerifierLogs/<stamp>`). */
	readonly logsFolder: string;
	private readonly target: EngineTarget;
	private readonly signal: AbortSignal;
	private readonly lock: HeldWorkspaceLock;

	/** Quests the template itself ships (the sample); never reported as the verifier's and never parked or removed by it. */
	private readonly templateQuestIds: ReadonlySet<string>;
	private readonly parking: QuestParking;
	private runNumber = 0;
	private lastBuildEnded = 0;

	/** Use `EngineSandbox.create`. */
	private constructor(folder: string, logsFolder: string, target: EngineTarget, signal: AbortSignal, lock: HeldWorkspaceLock, templateQuestIds: ReadonlySet<string>, parking: QuestParking)
	{
		this.folder = folder;
		this.logsFolder = logsFolder;
		this.target = target;
		this.signal = signal;
		this.lock = lock;
		this.templateQuestIds = templateQuestIds;
		this.parking = parking;
	}

	/**
	 * Takes the workspace lock for `target.version` (major.minor), then brings the workspace to the template's state: changed
	 * template files are written, files the template lacks are removed, `EngineAssociation` is set and the 5.8 plugins dropped
	 * for older engines as SandboxProjectService does (A41). Build outputs are kept, so builds are incremental. The last run's
	 * quests are left in place (`questsInPlace` lists them) for the verifier to reuse or remove, so an unchanged quest is not
	 * rewritten and recompiled (A1321).
	 */
	static async create(templateFolder: string, target: EngineTarget, options: SandboxCreateOptions = {}): Promise<EngineSandbox>
	{
		const signal = options.signal ?? new AbortController().signal;
		const log = options.log ?? (() => undefined);
		const [major = 0, minor = 0] = target.version.split(".").map(Number);
		const root = options.workspaceRoot ?? resolveWorkspaceRoot({ platform: process.platform, homeFolder: homedir(), environment: process.env });

		const wanted = resolve(root, `${major}.${minor}`);

		log(`engine: verify workspace path ${wanted} (${wanted.length} characters)`);

		// Checked before anything is created, so a refused path leaves no folders behind.
		if (process.platform === "win32" && wanted.length >= LONG_WORKSPACE_PATH)
		{
			throw new Error(`the workspace path ${wanted} is ${wanted.length} characters long, and Windows builds fail from ${LONG_WORKSPACE_PATH}; use a shorter folder with --workspace or ${WORKSPACE_ENVIRONMENT_VARIABLE} (not under AppData: the Claude desktop app redirects it into a package path about 47 characters longer)`);
		}

		await mkdir(wanted, { recursive: true });

		// The real path matters on macOS: Unreal's build accelerator refuses to write outputs when two spellings of one folder disagree.
		// On Windows it is left as given: under the Claude desktop app the resolved path of an AppData folder is the redirected package path, over the limit.
		const folder = process.platform === "win32" ? wanted : await realpath(wanted);

		const lock = await new WorkspaceLock({ folder: `${folder}.lock`, log, signal, ...options.lock }).acquire();

		try
		{
			// The previous run may have released the lock right after a build; files written now must still be newer than its outputs.
			const lastBuildEnded = Number(await readFile(join(folder, LAST_BUILD_ENDED_FILE), "utf8").catch(() => "0")) || 0;

			await waitPast(lastBuildEnded);

			const project = JSON.parse(await readFile(join(templateFolder, "Dojo.uproject"), "utf8")) as { EngineAssociation?: string; Plugins?: { Name: string }[] };

			project.EngineAssociation = `${major}.${minor}`;

			if (major === 5 && minor < 8) project.Plugins = (project.Plugins ?? []).filter((plugin) => !PLUGINS_FROM_5_8.has(plugin.Name));

			const templateQuestIds = await questIdsIn(templateFolder);
			const summary = await syncWorkspace(templateFolder, folder, new Map([["Dojo.uproject", `${JSON.stringify(project, null, "\t")}\n`]]), BUILD_OUTPUT_FOLDERS, (path) => isQuestPath(path, templateQuestIds));
			const logsRoot = join(folder, "Saved", "VerifierLogs");

			const parking = new QuestParking(join(folder, PARKED_FOLDER));

			await parking.removeUnfinished();

			await mkdir(logsRoot, { recursive: true });
			await pruneRunLogs(logsRoot, KEPT_RUN_LOGS - 1);

			const logsFolder = join(logsRoot, runStamp());

			await mkdir(logsFolder, { recursive: true });
			log(`engine: verify workspace at ${folder} (${summary.written.length} template files written, ${summary.removed.length} stale entries removed)`);

			return new EngineSandbox(folder, logsFolder, target, signal, lock, templateQuestIds, parking);
		}
		catch (error)
		{
			// A failed release must not hide the error that made the run stop.
			await lock.release().catch(() => undefined);

			throw error;
		}
	}

	/**
	 * Writes a quest's files to `Source/Dojo/Quests/<quest-id>/` and its tests to `Source/Dojo/Tests/<quest-id>.Test.cpp` with
	 * QuestFileWriter. A parked quest's files are moved back first, keeping their old times, so a file whose bytes still match is
	 * not recompiled (with KeepUnchangedFileSystem under the writer, A1320); a file that differs is written fresh and rebuilt.
	 */
	async writeQuest(quest: QuestForWriting, files: readonly SandboxFile[]): Promise<void>
	{
		this.assertManagedQuest(quest.id);
		await this.waitPastLastBuild();
		await this.parking.restore(quest.id, this.locationOf(quest.id));
		await this.target.tools.writer.write(this.folder, quest, Object.fromEntries(files.map((file) => [file.name, file.text])));
	}

	/**
	 * Takes a quest out of the build without deleting its files (A1322): its learner files and test file move to the parked folder
	 * under `Saved`, and its now empty quest folder stays, so the module's include paths (one per quest folder, in Dojo.Build.cs)
	 * do not change and the rest of the module is not recompiled. `writeQuest` brings the files back.
	 */
	async parkQuest(questId: string): Promise<void>
	{
		this.assertManagedQuest(questId);
		await this.parking.park(questId, this.locationOf(questId));
	}

	/** Removes a quest's folder and test file with QuestFileWriter, and any parked copy of it. */
	async removeQuest(questId: string): Promise<void>
	{
		this.assertManagedQuest(questId);
		await this.waitPastLastBuild();
		await this.target.tools.writer.remove(this.folder, questId);
		await this.parking.discard(questId);
	}

	/** The quests an earlier run left in the workspace, in place or parked; the template's own quests are not listed. */
	async questsInPlace(): Promise<string[]>
	{
		const ids = new Set([...(await questIdsIn(this.folder)), ...(await this.parking.parkedIds())]);

		return [...ids].filter((id) => !this.templateQuestIds.has(id)).sort();
	}

	/** Builds the editor target with UnrealBuilder. The full output is saved in this run's `logsFolder`. */
	async build(): Promise<SandboxBuild>
	{
		const allLines: string[] = [];
		const outcome = await this.target.tools.builder.build({
			engineRoot: this.target.root,
			projectFile: this.projectFile(),
			signal: this.signal,
			onLine: (line) => allLines.push(line),
		}).finally(async () =>
		{
			this.lastBuildEnded = Date.now();

			// Best effort: a lost time only costs the next run its safety gap.
			await mkdir(join(this.folder, "Saved"), { recursive: true }).then(() => writeFile(join(this.folder, LAST_BUILD_ENDED_FILE), String(this.lastBuildEnded), "utf8")).catch(() => undefined);
		});

		await this.saveLog(`build-${++this.runNumber}.log`, allLines, `exit code: ${String(outcome.exitCode)}${outcome.timedOut ? " (timed out)" : ""}`);

		const build: SandboxBuild = { succeeded: outcome.succeeded, lines: outcome.filteredOutput.split("\n").filter((line) => line.trim() !== "") };

		if (outcome.pipelineError !== undefined) build.pipelineError = outcome.pipelineError;

		return build;
	}

	/** Runs exactly these tests headless with AutomationTestRunner (anchored names) and maps its results by name. */
	async runTests(testNames: readonly string[]): Promise<SandboxTestRun>
	{
		const reportFolder = join(this.logsFolder, `reports-${++this.runNumber}`);
		const allLines: string[] = [];

		await mkdir(reportFolder, { recursive: true });

		const outcome = await this.target.tools.testRunner.run({
			engineRoot: this.target.root,
			projectFile: this.projectFile(),
			testNames: [...testNames],
			reportFolder,
			signal: this.signal,
			onLine: (line) => allLines.push(line),
		});

		await this.saveLog(`tests-${this.runNumber}.log`, allLines, `exit code: ${String(outcome.exitCode)}${outcome.pipelineError === undefined ? "" : ` (${outcome.pipelineError})`}`);

		const run: SandboxTestRun = { outcomes: undefined };

		if (outcome.tests.length > 0)
		{
			run.outcomes = new Map(outcome.tests.map((test) => [test.name, { passed: test.passed, state: test.passed ? "Success" : "Fail", messages: test.message === undefined ? [] : [test.message] }]));
		}

		if (outcome.pipelineError !== undefined) run.pipelineError = outcome.pipelineError;

		return run;
	}

	/** Ends this run's use of the workspace by releasing its lock. The project, its build outputs and this run's logs stay for the next run. */
	async release(): Promise<void>
	{
		await this.lock.release();
	}

	/** Where a quest's learner files and test file live in the workspace. */
	private locationOf(questId: string): QuestLocation
	{
		const writer = this.target.tools.writer;

		return { questFolder: writer.questFolder(this.folder, questId), testFile: writer.testFile(this.folder, questId) };
	}

	/** Throws for an id that could leave the parked or quest folders, or that names one of the template's own quests. */
	private assertManagedQuest(questId: string): void
	{
		if (!QUEST_ID.test(questId)) throw new Error(`Unsafe quest id for the verify workspace: ${questId}`);
		if (this.templateQuestIds.has(questId)) throw new Error(`${questId} is the sandbox template's own quest; the verifier does not manage it`);
	}

	/** Waits until the clock is past the last build by more than a second, so files written now are newer than every output. */
	private async waitPastLastBuild(): Promise<void>
	{
		await waitPast(this.lastBuildEnded);
	}

	/** Writes a run's full output to this run's logs folder for anyone inspecting a failure. */
	private async saveLog(name: string, lines: readonly string[], footer: string): Promise<void>
	{
		await mkdir(this.logsFolder, { recursive: true });
		await writeFile(join(this.logsFolder, name), `${lines.join("\n")}\n${footer}\n`, "utf8");
	}

	/** The copy's `.uproject`. */
	private projectFile(): string
	{
		return join(this.folder, "Dojo.uproject");
	}
}
