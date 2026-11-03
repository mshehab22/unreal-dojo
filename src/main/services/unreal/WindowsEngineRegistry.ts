// Reads engine folders from the Windows registry through `reg query`, so no native module is needed.
import type { CommandRunner } from "./CommandRunner";
import type { EngineRegistry } from "./EngineRegistry";
import { registryStringValues } from "./registryValues";

/** Launcher installs: one subkey per version, each with an `InstalledDirectory` value. */
const LAUNCHER_KEY = "HKLM\\SOFTWARE\\EpicGames\\Unreal Engine";

/** Engines built from source: one value per engine, named by a GUID, holding the folder. */
const SOURCE_BUILDS_KEY = "HKCU\\Software\\Epic Games\\Unreal Engine\\Builds";

/** EngineRegistry for Windows: asks `reg.exe` for the launcher key and the source-build key and parses the text it prints. */
export class WindowsEngineRegistry implements EngineRegistry
{
	private readonly commandRunner: CommandRunner;

	/** Takes the runner that spawns `reg`. */
	constructor(commandRunner: CommandRunner)
	{
		this.commandRunner = commandRunner;
	}

	/** Returns launcher installs first, then source builds. The launcher key is read in the 64-bit view, and in the 32-bit view (`WOW6432Node`) only when the 64-bit view lists no engine (A1314). */
	async engineFolders(): Promise<string[]>
	{
		const launcherQuery = ["query", LAUNCHER_KEY, "/s", "/v", "InstalledDirectory"];
		const launcherFolders = await this.queryValues(launcherQuery);
		const launcherFoldersIn32BitView = launcherFolders.length === 0 ? await this.queryValues([...launcherQuery, "/reg:32"]) : [];
		const sourceBuildFolders = await this.queryValues(["query", SOURCE_BUILDS_KEY]);

		return [...launcherFolders, ...launcherFoldersIn32BitView, ...sourceBuildFolders];
	}

	/** Runs one `reg query` and returns the data of every string value it prints. A missing key exits with 1 and answers an empty list. */
	private async queryValues(commandArguments: string[]): Promise<string[]>
	{
		const result = await this.commandRunner.run("reg", commandArguments);
		if (!result.started || result.exitCode !== 0) return [];

		return registryStringValues(result.stdout);
	}
}
