// Checks before any run that the engine and sandbox in Settings are still there, so a moved engine or a deleted sandbox gets a plain explanation instead of a raw ENOENT.
import { AppErrorException } from "../../errors/AppErrorException";
import type { PlatformPaths } from "./PlatformPaths";
import type { RunnerContext } from "./Runner";
import { PROJECT_FILE_NAME, type EngineInspector } from "./SandboxProjectService";
import { sandboxMovedOrDeleted } from "./sandboxErrors";
import type { UnrealSettingsStore } from "./UnrealSettingsStore";
import { engineMovedOrUninstalled } from "./unrealErrors";

/** What the preflight reads. */
export interface RunPreflightDependencies
{
	settings: Pick<UnrealSettingsStore, "getEnginePath" | "getSandboxPath">;
	paths: PlatformPaths;
	engineInspector: EngineInspector;

	/** Reads a text file, or null when it is missing. */
	fileSystem: { readTextFile(filePath: string): Promise<string | null> };
}

/** Confirms the saved engine still passes the engine locator and the saved sandbox still holds `Dojo.uproject`. */
export class RunPreflight
{
	private readonly dependencies: RunPreflightDependencies;

	/** Takes the settings, paths, engine inspector, and file reader. */
	constructor(dependencies: RunPreflightDependencies)
	{
		this.dependencies = dependencies;
	}

	/** The engine and sandbox from Settings. Rejects with `sandbox-not-ready` before setup or when the sandbox is gone, `engine-version-unsupported` for an engine too old, and `engine-not-found` when the engine moved. */
	async check(): Promise<RunnerContext>
	{
		const engineRoot = this.dependencies.settings.getEnginePath();
		const sandboxFolder = this.dependencies.settings.getSandboxPath();

		if (engineRoot === null || sandboxFolder === null) throw new AppErrorException("sandbox-not-ready", "The sandbox project has not been set up yet.", "Unreal Dojo shows its first-run setup until this is done. Open the Title screen, choose Set up your studio, finish it (pick the engine and create the sandbox), then run again.");

		await this.requireEngine(engineRoot);
		await this.requireSandbox(sandboxFolder);

		return { engineRoot, sandboxFolder };
	}

	/** Lets the locator judge the engine. A version error passes through as it is; any other failure means the engine is gone. */
	private async requireEngine(engineRoot: string): Promise<void>
	{
		try
		{
			await this.dependencies.engineInspector.inspectFolder(engineRoot);
		}
		catch (error)
		{
			if (error instanceof AppErrorException && error.appError.code === "engine-version-unsupported") throw error;

			const moved = engineMovedOrUninstalled(engineRoot, error instanceof Error ? error.message : String(error));

			throw new AppErrorException(moved.code, moved.message, moved.suggestedAction, moved.detail);
		}
	}

	/** Throws when `Dojo.uproject` cannot be read in the sandbox folder. */
	private async requireSandbox(sandboxFolder: string): Promise<void>
	{
		const projectFile = this.dependencies.paths.join(sandboxFolder, PROJECT_FILE_NAME);

		try
		{
			if ((await this.dependencies.fileSystem.readTextFile(projectFile)) !== null) return;
		}
		catch
		{
			// An unreadable folder is as good as a missing one for the learner: the project cannot be used.
		}

		throw sandboxMovedOrDeleted(sandboxFolder);
	}
}
