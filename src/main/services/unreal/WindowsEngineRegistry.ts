// Reads engine folders from the Windows registry through `reg query`, so no native module is needed.
import type { CommandRunner } from "./CommandRunner";
import type { EngineRegistry } from "./EngineRegistry";

/** Launcher installs: one subkey per version, each with an `InstalledDirectory` value. */
const LAUNCHER_KEY = "HKLM\\SOFTWARE\\EpicGames\\Unreal Engine";

/** Engines built from source: one value per engine, named by a GUID, holding the folder. */
const SOURCE_BUILDS_KEY = "HKCU\\Software\\Epic Games\\Unreal Engine\\Builds";

/** Matches a `reg query` value line: four spaces, name, type, data. */
const VALUE_LINE = /^\s+(.+?)\s{4}REG_(?:EXPAND_)?SZ\s{4}(.*)$/;

/** EngineRegistry for Windows: asks `reg.exe` for the launcher key and the source-build key and parses the text it prints. */
export class WindowsEngineRegistry implements EngineRegistry
{
	private readonly commandRunner: CommandRunner;

	/** Takes the runner that spawns `reg`. */
	constructor(commandRunner: CommandRunner)
	{
		this.commandRunner = commandRunner;
	}

	/** Returns launcher installs first, then source builds. */
	async engineFolders(): Promise<string[]>
	{
		const launcherFolders = await this.queryValues(["query", LAUNCHER_KEY, "/s", "/v", "InstalledDirectory"]);
		const sourceBuildFolders = await this.queryValues(["query", SOURCE_BUILDS_KEY]);

		return [...launcherFolders, ...sourceBuildFolders];
	}

	/** Runs one `reg query` and returns the data of every string value it prints. A missing key exits with 1 and answers an empty list. */
	private async queryValues(commandArguments: string[]): Promise<string[]>
	{
		const result = await this.commandRunner.run("reg", commandArguments);
		if (!result.started || result.exitCode !== 0) return [];

		const folders: string[] = [];

		for (const line of result.stdout.split(/\r?\n/))
		{
			const match = VALUE_LINE.exec(line);
			const data = match?.[2]?.trim();

			if (data) folders.push(data);
		}

		return folders;
	}
}
