// A throwaway copy of the sandbox template the verifier writes quest code into, then builds and tests through M1.3's runners (A211).
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { AutomationTestRunner } from "../../../src/main/services/unreal/AutomationTestRunner";
import type { PlatformPaths } from "../../../src/main/services/unreal/PlatformPaths";
import type { QuestFileWriter, QuestForWriting } from "../../../src/main/services/unreal/QuestFileWriter";
import type { UnrealBuilder } from "../../../src/main/services/unreal/UnrealBuilder";

/**
 * Gap kept between a build finishing and the next write. UBT rebuilds a file only when it is newer than its output,
 * and a file written in the same second as the last compile was skipped on 5.8.3 (seen in M1.8).
 */
const TIMESTAMP_GAP_MILLISECONDS = 1_100;

/** Plugins only 5.8 and later ship; removed from the copy for older engines (A41). */
const PLUGINS_FROM_5_8 = new Set(["ModelContextProtocol", "AutomationTestToolset", "LiveCodingToolset"]);

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

/** Owns one temporary sandbox project. Create it with `EngineSandbox.create`, and `remove()` it when done. */
export class EngineSandbox
{
	readonly folder: string;
	private readonly target: EngineTarget;
	private runNumber = 0;
	private lastBuildEnded = 0;

	/** Use `EngineSandbox.create`. */
	private constructor(folder: string, target: EngineTarget)
	{
		this.folder = folder;
		this.target = target;
	}

	/** Copies `templateFolder` to a new temp folder and points its `.uproject` at the engine version, as SandboxProjectService does. */
	static async create(templateFolder: string, target: EngineTarget): Promise<EngineSandbox>
	{
		// The real path matters on macOS: the temp folder is reached through the /var -> /private/var link, and Unreal's
		// build accelerator refuses to write outputs when the two spellings of one folder disagree.
		const folder = await realpath(await mkdtemp(join(tmpdir(), "dojo-verify-")));

		await cp(templateFolder, folder, { recursive: true });

		const projectFile = join(folder, "Dojo.uproject");
		const project = JSON.parse(await readFile(projectFile, "utf8")) as { EngineAssociation?: string; Plugins?: { Name: string }[] };
		const [major = 0, minor = 0] = target.version.split(".").map(Number);

		project.EngineAssociation = `${major}.${minor}`;

		if (major === 5 && minor < 8) project.Plugins = (project.Plugins ?? []).filter((plugin) => !PLUGINS_FROM_5_8.has(plugin.Name));

		await writeFile(projectFile, `${JSON.stringify(project, null, "\t")}\n`, "utf8");

		return new EngineSandbox(folder, target);
	}

	/** Writes a quest's files to `Source/Dojo/Quests/<quest-id>/` and its tests to `Source/Dojo/Tests/<quest-id>.Test.cpp` with QuestFileWriter. */
	async writeQuest(quest: QuestForWriting, files: readonly SandboxFile[]): Promise<void>
	{
		await this.waitPastLastBuild();
		await this.target.tools.writer.write(this.folder, quest, Object.fromEntries(files.map((file) => [file.name, file.text])));
	}

	/** Removes a quest's folder and test file with QuestFileWriter. */
	async removeQuest(questId: string): Promise<void>
	{
		await this.waitPastLastBuild();
		await this.target.tools.writer.remove(this.folder, questId);
	}

	/** Builds the editor target with UnrealBuilder. The full output is saved under `Saved/VerifierLogs/`. */
	async build(): Promise<SandboxBuild>
	{
		const allLines: string[] = [];
		const outcome = await this.target.tools.builder.build({
			engineRoot: this.target.root,
			projectFile: this.projectFile(),
			signal: new AbortController().signal,
			onLine: (line) => allLines.push(line),
		});

		this.lastBuildEnded = Date.now();
		await this.saveLog(`build-${++this.runNumber}.log`, allLines, `exit code: ${String(outcome.exitCode)}${outcome.timedOut ? " (timed out)" : ""}`);

		const build: SandboxBuild = { succeeded: outcome.succeeded, lines: outcome.filteredOutput.split("\n").filter((line) => line.trim() !== "") };

		if (outcome.pipelineError !== undefined) build.pipelineError = outcome.pipelineError;

		return build;
	}

	/** Runs exactly these tests headless with AutomationTestRunner (anchored names) and maps its results by name. */
	async runTests(testNames: readonly string[]): Promise<SandboxTestRun>
	{
		const reportFolder = join(this.folder, "Saved", "VerifierReports", `run-${++this.runNumber}`);
		const allLines: string[] = [];

		await mkdir(reportFolder, { recursive: true });

		const outcome = await this.target.tools.testRunner.run({
			engineRoot: this.target.root,
			projectFile: this.projectFile(),
			testNames: [...testNames],
			reportFolder,
			signal: new AbortController().signal,
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

	/** Deletes the whole temporary project. */
	async remove(): Promise<void>
	{
		await rm(this.folder, { recursive: true, force: true });
	}

	/** Waits until the clock is past the last build by more than a second, so files written now are newer than every output. */
	private async waitPastLastBuild(): Promise<void>
	{
		const remaining = this.lastBuildEnded + TIMESTAMP_GAP_MILLISECONDS - Date.now();

		if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
	}

	/** Writes a run's full output to `Saved/VerifierLogs/<name>` for anyone inspecting a kept sandbox. */
	private async saveLog(name: string, lines: readonly string[], footer: string): Promise<void>
	{
		const folder = join(this.folder, "Saved", "VerifierLogs");

		await mkdir(folder, { recursive: true });
		await writeFile(join(folder, name), `${lines.join("\n")}\n${footer}\n`, "utf8");
	}

	/** The copy's `.uproject`. */
	private projectFile(): string
	{
		return join(this.folder, "Dojo.uproject");
	}
}
