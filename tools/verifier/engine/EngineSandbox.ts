// A throwaway copy of the sandbox template that the verifier writes quest code into, builds, and tests headless.
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { PlatformPaths } from "../../../src/main/services/unreal/PlatformPaths";

import { readAutomationReport, type AutomationTestOutcome } from "./readAutomationReport";
import { runProcess, type ProcessResult } from "./runProcess";

/** Build timeout from the unreal-pipeline spec. */
const BUILD_TIMEOUT_MILLISECONDS = 15 * 60_000;

/** Headless test timeout from the unreal-pipeline spec. */
const TEST_TIMEOUT_MILLISECONDS = 10 * 60_000;

/**
 * Gap kept between a build finishing and the next write. UBT rebuilds a file only when it is newer than its output,
 * and a file written in the same second as the last compile was skipped on 5.8.3 (seen in M1.8).
 */
const TIMESTAMP_GAP_MILLISECONDS = 1_100;

/** Plugins only 5.8 and later ship; removed from the copy for older engines (A41). */
const PLUGINS_FROM_5_8 = new Set(["ModelContextProtocol", "AutomationTestToolset", "LiveCodingToolset"]);

/** Which engine to drive and how to reach its tools. */
export interface EngineTarget
{
	/** Engine root (the folder that contains `Engine/`). */
	root: string;

	/** For example `5.8.3`. */
	version: string;
	paths: PlatformPaths;
}

/** One file to place in a quest folder. */
export interface SandboxFile
{
	name: string;
	text: string;
}

/** The result of one headless test run. */
export interface SandboxTestRun
{
	process: ProcessResult;

	/** Outcome per full test name, or undefined when no report was written. */
	outcomes: Map<string, AutomationTestOutcome> | undefined;
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

	/** Replaces a quest's code folder `Source/Dojo/Quests/<quest-id>/` with `files`, written fresh so the build sees new times. */
	async writeQuestFiles(questId: string, files: readonly SandboxFile[]): Promise<void>
	{
		await this.waitPastLastBuild();

		const questFolder = join(this.folder, "Source", "Dojo", "Quests", questId);

		await rm(questFolder, { recursive: true, force: true });
		await mkdir(questFolder, { recursive: true });

		for (const file of files) await writeFile(join(questFolder, file.name), file.text, "utf8");
	}

	/** Writes a quest's tests to `Source/Dojo/Tests/<quest-id>.Test.cpp` with a header comment naming the quest. */
	async writeQuestTests(questId: string, source: string): Promise<void>
	{
		await this.waitPastLastBuild();

		await writeFile(join(this.folder, "Source", "Dojo", "Tests", `${questId}.Test.cpp`), `// Quest test: ${questId} (written by the content verifier).\n${source}\n`, "utf8");
	}

	/** Runs the editor target build (`Build.sh` or `Build.bat`), the exact command from the unreal-pipeline spec. The output is saved under `Saved/VerifierLogs/`. */
	async build(onLine?: (line: string) => void): Promise<ProcessResult>
	{
		const { paths, root } = this.target;
		const editorTarget = "DojoEditor";
		const result = await runProcess(paths.buildScript(root), [editorTarget, paths.buildPlatform, "Development", `-Project=${this.projectFile()}`, "-WaitMutex", "-Progress"], BUILD_TIMEOUT_MILLISECONDS, onLine);

		this.lastBuildEnded = Date.now();
		await this.saveLog(`build-${++this.runNumber}.log`, result);

		return result;
	}

	/** Runs the named tests headless with UnrealEditor-Cmd and reads the report. Names are joined with `+`, which RunTests accepts. */
	async runTests(testNames: readonly string[], onLine?: (line: string) => void): Promise<SandboxTestRun>
	{
		const { paths, root } = this.target;
		const reportFolder = join(this.folder, "Saved", "VerifierReports", `run-${++this.runNumber}`);

		await mkdir(reportFolder, { recursive: true });

		const args = [
			this.projectFile(),
			`-ExecCmds=Automation RunTests ${testNames.join("+")}; Quit`,
			"-Unattended",
			"-NoPause",
			"-NullRHI",
			"-NoSplash",
			"-NoSound",
			"-stdout",
			"-FullStdOutLogOutput",
			`-ReportExportPath=${reportFolder}`,
			"-log",
		];
		const process = await runProcess(paths.editorCmdBinary(root), args, TEST_TIMEOUT_MILLISECONDS, onLine);

		await this.saveLog(`tests-${this.runNumber}.log`, process);

		return { process, outcomes: await readAutomationReport(reportFolder) };
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

	/** Writes a process's output to `Saved/VerifierLogs/<name>` for anyone inspecting a kept sandbox. */
	private async saveLog(name: string, result: ProcessResult): Promise<void>
	{
		const folder = join(this.folder, "Saved", "VerifierLogs");

		await mkdir(folder, { recursive: true });
		await writeFile(join(folder, name), `${result.lines.join("\n")}\nexit code: ${String(result.exitCode)}${result.timedOut ? " (timed out)" : ""}\n`, "utf8");
	}

	/** The copy's `.uproject`. */
	private projectFile(): string
	{
		return join(this.folder, "Dojo.uproject");
	}
}
