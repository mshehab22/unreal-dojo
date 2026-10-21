// Creates the learner's sandbox Unreal project from the shipped template and runs its first full build.
import type { EngineInstall, SandboxSetupResult } from "@shared/types/engine";

import type { PlatformPaths } from "./PlatformPaths";
import type { ProgressListener } from "./ProgressUpdate";
import type { SandboxFileSystem } from "./SandboxFileSystem";
import type { SandboxPathStore } from "./SandboxPathStore";
import { runCancelled, sandboxCopyFailed, sandboxFolderNotEmpty, sandboxNotReady } from "./sandboxErrors";
import type { Timer } from "./SupervisedProcess";
import type { UnrealBuilder } from "./UnrealBuilder";

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
}

/** Copies the template, writes EngineAssociation, drops the 5.8 plugins for older engines, builds, and remembers the folder. */
export class SandboxProjectService
{
	private readonly dependencies: SandboxProjectDependencies;

	/** Takes everything it touches, so tests can pass fakes. */
	constructor(dependencies: SandboxProjectDependencies)
	{
		this.dependencies = dependencies;
	}

	/** The sandbox project folder created inside the folder the learner picked. */
	sandboxFolderFor(pickedFolder: string): string
	{
		return this.dependencies.paths.join(pickedFolder, SANDBOX_FOLDER_NAME);
	}

	/** Plain-English warnings about a picked folder; today only the Windows path length (spec: over 100 characters). */
	folderWarnings(pickedFolder: string): string[]
	{
		const limit = this.dependencies.paths.maximumSandboxPathLength;
		const sandboxFolder = this.sandboxFolderFor(pickedFolder);

		if (limit === null || sandboxFolder.length <= limit) return [];

		return [`The sandbox path is ${sandboxFolder.length} characters long. Unreal's build can fail on Windows when it is over ${limit}; a short folder such as C:\\Dojo is safer.`];
	}

	/** Creates the sandbox and runs its first full build. Throws an AppError exception for a bad folder or engine, or `run-cancelled`. A failed build resolves with `ok: false`. */
	async create(enginePath: string, pickedFolder: string, onProgress: ProgressListener, signal: AbortSignal): Promise<SandboxSetupResult>
	{
		const { paths, fileSystem, timer } = this.dependencies;
		const startedAt = timer.now();

		onProgress({ phase: "preparing", lastLine: "Checking the engine" });
		for (const warning of this.folderWarnings(pickedFolder)) onProgress({ phase: "preparing", lastLine: warning });

		const engine = await this.dependencies.engineInspector.inspectFolder(enginePath);
		const sandboxFolder = await this.resolvedSandboxFolder(pickedFolder);

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

		return this.buildSandbox(enginePath, sandboxFolder, startedAt, onProgress, signal);
	}

	/** Deletes the build products and runs a clean full build of an existing sandbox. */
	async rebuild(enginePath: string, sandboxFolder: string, onProgress: ProgressListener, signal: AbortSignal): Promise<SandboxSetupResult>
	{
		const { paths, fileSystem, timer } = this.dependencies;
		const startedAt = timer.now();

		if ((await fileSystem.readTextFile(paths.join(sandboxFolder, PROJECT_FILE_NAME))) === null) throw sandboxNotReady(sandboxFolder);

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

		const compilerOutput = outcome.pipelineError ? `${outcome.pipelineError}\n${outcome.filteredOutput}`.trim() : outcome.filteredOutput;

		return { ok: outcome.succeeded, sandboxPath: sandboxFolder, durationMs: timer.now() - startedAt, compilerOutput };
	}
}
