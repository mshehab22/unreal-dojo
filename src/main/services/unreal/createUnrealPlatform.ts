// Picks the Windows or macOS objects from process.platform. The only place in the app that branches on the platform for Unreal (D16).
import type { CommandRunner } from "./CommandRunner";
import type { EngineRegistry } from "./EngineRegistry";
import { MacPlatformPaths } from "./MacPlatformPaths";
import { MacToolchainChecker } from "./MacToolchainChecker";
import type { PlatformPaths } from "./PlatformPaths";
import type { ToolchainChecker } from "./ToolchainChecker";
import { WindowsEngineRegistry } from "./WindowsEngineRegistry";
import { WindowsPlatformPaths } from "./WindowsPlatformPaths";
import { WindowsToolchainChecker } from "./WindowsToolchainChecker";

/** The platform-specific pieces the Unreal services are built from. */
export interface UnrealPlatform
{
	paths: PlatformPaths;
	toolchainChecker: ToolchainChecker;

	/** The Windows registry, or null on macOS. */
	engineRegistry: EngineRegistry | null;
}

/** What the factory reads from the running process. Passed in so tests can ask for either platform. */
export interface UnrealPlatformInputs
{
	/** `process.platform`. */
	platform: string;

	/** `os.homedir()`. */
	homeFolder: string;

	/** `process.env`. */
	environment: Record<string, string | undefined>;

	/** Spawns registry and toolchain queries. */
	commandRunner: CommandRunner;
}

/** Returns the Windows objects on `win32`, the Mac objects on `darwin`, and null anywhere else. */
export function createUnrealPlatform(inputs: UnrealPlatformInputs): UnrealPlatform | null
{
	const { platform, homeFolder, environment, commandRunner } = inputs;

	if (platform === "win32")
	{
		const paths = new WindowsPlatformPaths({ programFiles: environment.ProgramFiles, programData: environment.ProgramData });

		return { paths, toolchainChecker: new WindowsToolchainChecker(commandRunner, environment["ProgramFiles(x86)"]), engineRegistry: new WindowsEngineRegistry(commandRunner) };
	}

	if (platform === "darwin") return { paths: new MacPlatformPaths(homeFolder), toolchainChecker: new MacToolchainChecker(commandRunner), engineRegistry: null };

	return null;
}
