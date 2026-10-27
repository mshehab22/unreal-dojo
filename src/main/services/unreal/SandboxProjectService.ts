// Creates the learner's sandbox Unreal project from the shipped template and runs its first full build.
import type { EngineInstall, SandboxSetupResult } from "@shared/types/engine";
import type { AppError } from "@shared/types/errors";

import type { BuildFailureExplainer } from "./BuildFailureExplainer";
import type { PlatformPaths } from "./PlatformPaths";
import type { ProgressListener } from "./ProgressUpdate";
import type { SandboxFileSystem } from "./SandboxFileSystem";
import type { SandboxPathStore } from "./SandboxPathStore";
import { SandboxFolderRules } from "./SandboxFolderRules";
import { runCancelled, sandboxCopyFailed, sandboxFolderNotEmpty, sandboxNotReady, sandboxPathUnsupported } from "./sandboxErrors";
import type { Timer } from "./SupervisedProcess";
import type { BuildOutcome, UnrealBuilder } from "./UnrealBuilder";

/** The project file name inside every sandbox. */
export const PROJECT_FILE_NAME = "Dojo.uproject";

/** The folder created inside the folder the learner picks (A184). */
export const SANDBOX_FOLDER_NAME = "DojoSandbox";

/** Plugins that exist only from UE 5.8 and are removed from the project for older engines (A41). */
export const FAST_LOOP_PLUGINS = ["ModelContextProtocol", "AutomationTestToolset", "LiveCodingToolset"];

/** Build products that are never copied from the template and are deleted for a clean rebuild. */
export const BUILD_PRODUCT_FOLDERS = ["Binaries", "Intermediate", "Saved", "DerivedDataCache"];

/** Reads an engine folder's version. EngineLocator satisfies it. */
export interface EngineInspector
{
	/** The engine at that folder; throws an AppError exception when it is not a supported engine. */
	inspectFolder(folder: string): Promise<EngineInstall>;
}

/** What the service is built from. */
export interface SandboxProjectDependencies
{
	paths: PlatformPaths;
	fileSystem: SandboxFileSystem;
	builder: UnrealBuilder;
	engineInspector: EngineInspector;
	pathStore: SandboxPathStore;
	timer: Timer;

	/** The shipped template folder (`resources/sandbox-template`). */
	templateFolder: string;

	/** Told around every full build, so the fast loop can close an editor on this sandbox first and record the build (M1.4b). */
	buildHooks?: SandboxBuildHooks;

	/** Explains a failed full build in plain English (M5.1d). Without it a failed setup carries no `failure`. */
	failureExplainer?: BuildFailureExplainer;

	/** The engine folder saved in settings, so a folder picked before setup can be checked against it (M5.1e). Without it a pick is checked only when `create` gets the engine. */
	savedEnginePath?: () => string | null;
}

/** Called before and after the full build of create and rebuild. */
export interface SandboxBuildHooks
{
	/** Runs before anything in the sandbox is deleted or built; closes an editor that has this sandbox open. */
	beforeBuild(sandboxFolder: string): Promise<void>;

	/** Runs after the build finished (not after a cancel). */
	afterBuild(succeeded: boolean): void;
}

/** Copies the template, writes EngineAssociation, drops the 5.8 plugins for older engines, builds, and remembers the folder. */
export class SandboxProjectService
{
	private readonly dependencies: SandboxProjectDependencies;
	private readonly rules: SandboxFolderRules;

	/** Takes everything it touches, so tests can pass fakes. */
	constructor(dependencies: SandboxProjectDependencies)
	{
		this.dependencies = dependencies;
		this.rules = new SandboxFolderRules(dependencies.paths);
	}

	/** The sandbox project folder created inside the folder the learner picked. */
	sandboxFolderFor(pickedFolder: string): string
	{
		return this.dependencies.paths.join(pickedFolder, SANDBOX_FOLDER_NAME);
	}

	/** Plain-English warnings about a picked folder: a long Windows path, non-ASCII letters, a cloud-synced or network folder, or Program Files (A1204). The folder can still be used. */
	folderWarnings(pickedFolder: string): string[]
	{
		return this.rules.warnings(pickedFolder, this.sandboxFolderFor(pickedFolder));
	}

	/** Plain-English reasons a picked folder cannot be used at all: today, being inside the engine folder. Uses `enginePath`, or the engine saved in settings when none is given. */
	folderBlockers(pickedFolder: string, enginePath: string | null = this.dependencies.savedEnginePath?.() ?? null): string[]
	{
		return this.rules.blockers(pickedFolder, enginePath);
	}

	/** Creates the sandbox and runs its first full build. Throws an AppError exception for a bad folder (`sandbox-path-unsupported` inside the engine folder) or engine, or `run-cancelled`. A failed build resolves with `ok: false`. */
	async create(enginePath: string, pickedFolder: string, onProgress: ProgressListener, signal: AbortSignal): Promise<SandboxSetupResult>
	{
		const { paths, fileSystem, timer } = this.dependencies;
		const startedAt = timer.now();

		const [blocker] = this.folderBlockers(pickedFolder, enginePath);
		if (blocker !== undefined) throw sandboxPathUnsupported(pickedFolder, blocker);

		onProgress({ phase: "preparing", lastLine: "Checking the engine" });
		for (const warning of this.folderWarnings(pickedFolder)) onProgress({ phase: "preparing", lastLine: warning });

		const engine = await this.dependencies.engineInspector.inspectFolder(enginePath);
		const sandboxFolder = await this.resolvedSandboxFolder(pickedFolder);

		// A symbolic link can hide the engine folder from the first check, so check again on the real paths before copying.
		const [resolvedBlocker] = await this.blockersOnRealPaths(enginePath, paths.parentFolder(sandboxFolder));
		if (resolvedBlocker !== undefined) throw sandboxPathUnsupported(pickedFolder, resolvedBlocker);

		if ((await fileSystem.listEntries(sandboxFolder)).length > 0) throw sandboxFolderNotEmpty(sandboxFolder);

		onProgress({ phase: "writing", lastLine: `Copying the sandbox template to ${sandboxFolder}` });

		try
		{
			await fileSystem.copyFolder(this.dependencies.templateFolder, sandboxFolder, BUILD_PRODUCT_FOLDERS);
			await this.writeProjectFile(paths.join(sandboxFolder, PROJECT_FILE_NAME), engine.version);
		}
		catch (error)
		{
			throw sandboxCopyFailed(sandboxFolder, (error as Error).message);
		}

		// Remember the folder before building: a failed first build is fixed by rebuilding the same sandbox.
		this.dependencies.pathStore.setSandboxPath(sandboxFolder);
		await this.dependencies.pathStore.setEnginePath(enginePath);
		await this.dependencies.buildHooks?.beforeBuild(sandboxFolder);

		return this.buildSandbox(enginePath, sandboxFolder, startedAt, onProgress, signal);
	}

	/** Deletes the build products and runs a clean full build of an existing sandbox. */
	async rebuild(enginePath: string, sandboxFolder: string, onProgress: ProgressListener, signal: AbortSignal): Promise<SandboxSetupResult>
	{
		const { paths, fileSystem, timer } = this.dependencies;
		const startedAt = timer.now();

		if ((await fileSystem.readTextFile(paths.join(sandboxFolder, PROJECT_FILE_NAME))) === null) throw sandboxNotReady(sandboxFolder);

		await this.dependencies.buildHooks?.beforeBuild(sandboxFolder);

		onProgress({ phase: "preparing", lastLine: "Removing old build products" });
		for (const folderName of BUILD_PRODUCT_FOLDERS) await fileSystem.removeFolder(paths.join(sandboxFolder, folderName));

		return this.buildSandbox(enginePath, sandboxFolder, startedAt, onProgress, signal);
	}

	/** The sandbox folder under the picked folder with symbolic links resolved: UBT on macOS lost its precompiled header and object files when the project path went through `/var`, a link to `/private/var` (A190). */
	private async resolvedSandboxFolder(pickedFolder: string): Promise<string>
	{
		const fileSystem = this.dependencies.fileSystem;

		try
		{
			await fileSystem.makeFolder(pickedFolder);

			return this.sandboxFolderFor(await fileSystem.realPath(pickedFolder));
		}
		catch (error)
		{
			throw sandboxCopyFailed(pickedFolder, (error as Error).message);
		}
	}

	/** The blockers for a picked folder whose symbolic links are already resolved, against the engine as spelled and with its own links resolved. */
	private async blockersOnRealPaths(enginePath: string, resolvedPickedFolder: string): Promise<string[]>
	{
		const spellings = [enginePath];

		try
		{
			spellings.push(await this.dependencies.fileSystem.realPath(enginePath));
		}
		catch
		{
			// The engine was just inspected, so a path that cannot be resolved has nothing more to tell.
		}

		return spellings.flatMap((spelling) => this.folderBlockers(resolvedPickedFolder, spelling)).slice(0, 1);
	}

	/** Sets EngineAssociation to `major.minor` and removes the 5.8 plugins for older engines. */
	private async writeProjectFile(projectFile: string, engineVersion: string): Promise<void>
	{
		const fileSystem = this.dependencies.fileSystem;
		const text = await fileSystem.readTextFile(projectFile);
		if (text === null) throw new Error("The template has no Dojo.uproject");

		const project = JSON.parse(text) as { EngineAssociation?: string; Plugins?: { Name: string }[] };
		const [major = 0, minor = 0] = engineVersion.split(".").map(Number);

		project.EngineAssociation = `${major}.${minor}`;

		if (major < 5 || (major === 5 && minor < 8)) project.Plugins = (project.Plugins ?? []).filter((plugin) => !FAST_LOOP_PLUGINS.includes(plugin.Name));

		await fileSystem.writeTextFile(projectFile, `${JSON.stringify(project, null, "\t")}\n`);
	}

	/** Runs the full build and streams its lines as `building` progress. */
	private async buildSandbox(enginePath: string, sandboxFolder: string, startedAt: number, onProgress: ProgressListener, signal: AbortSignal): Promise<SandboxSetupResult>
	{
		const { paths, builder, timer } = this.dependencies;

		onProgress({ phase: "building", lastLine: "Starting the first full build", percent: 0 });

		const outcome = await builder.build({
			engineRoot: enginePath,
			projectFile: paths.join(sandboxFolder, PROJECT_FILE_NAME),
			signal,
			onLine: (line, percent) => onProgress(percent === null ? { phase: "building", lastLine: line } : { phase: "building", lastLine: line, percent }),
		});

		if (outcome.cancelled) throw runCancelled();

		this.dependencies.buildHooks?.afterBuild(outcome.succeeded);

		const compilerOutput = outcome.pipelineError ? `${outcome.pipelineError}\n${outcome.filteredOutput}`.trim() : outcome.filteredOutput;
		const result: SandboxSetupResult = { ok: outcome.succeeded, sandboxPath: sandboxFolder, durationMs: timer.now() - startedAt, compilerOutput };

		const failure = outcome.succeeded ? undefined : await this.explainFailure(enginePath, outcome);
		if (failure) result.failure = failure;

		return result;
	}

	/** Why a failed build failed, in plain English; undefined when no explainer was given or it failed itself. */
	private async explainFailure(enginePath: string, outcome: BuildOutcome): Promise<AppError | undefined>
	{
		try
		{
			return await this.dependencies.failureExplainer?.explainSandbox({ engineRoot: enginePath, compilerOutput: outcome.filteredOutput, ...(outcome.pipelineError === undefined ? {} : { pipelineError: outcome.pipelineError }) });
		}
		catch
		{
			return undefined;
		}
	}
}
