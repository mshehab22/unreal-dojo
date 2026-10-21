// Unreal paths on macOS.
import { posix } from "node:path";

import type { PlatformPaths, UnrealBuildPlatform } from "./PlatformPaths";

/** PlatformPaths for macOS. Paths are case sensitive here because APFS can be either and exact matches are always safe. */
export class MacPlatformPaths implements PlatformPaths
{
	readonly buildPlatform: UnrealBuildPlatform = "Mac";
	readonly caseInsensitivePaths = false;
	readonly verbatimArguments = false;
	readonly testNameEndAnchor = "";
	readonly maximumSandboxPathLength = null;

	private readonly homeFolder: string;

	/** Takes the learner's home folder, where the launcher keeps its records and may install engines. */
	constructor(homeFolder: string)
	{
		this.homeFolder = homeFolder;
	}

	/** Joins with forward slashes. */
	join(...parts: string[]): string
	{
		return posix.join(...parts);
	}

	/** Returns the containing folder. */
	parentFolder(somePath: string): string
	{
		return posix.dirname(somePath);
	}

	/** Returns the last path part. */
	baseName(somePath: string): string
	{
		return posix.basename(somePath);
	}

	/** Normalizes and drops a trailing slash. */
	pathKey(somePath: string): string
	{
		return posix.normalize(somePath).replace(/\/+$/, "");
	}

	/** `<root>/Engine/Build/Build.version`. */
	buildVersionFile(engineRoot: string): string
	{
		return posix.join(engineRoot, "Engine", "Build", "Build.version");
	}

	/** `<root>/Engine/Build/BatchFiles/Mac/Build.sh`. */
	buildScript(engineRoot: string): string
	{
		return posix.join(engineRoot, "Engine", "Build", "BatchFiles", "Mac", "Build.sh");
	}

	/** `<root>/Engine/Binaries/Mac/UnrealEditor.app/Contents/MacOS/UnrealEditor`. */
	editorBinary(engineRoot: string): string
	{
		return posix.join(engineRoot, "Engine", "Binaries", "Mac", "UnrealEditor.app", "Contents", "MacOS", "UnrealEditor");
	}

	/** `<root>/Engine/Binaries/Mac/UnrealEditor-Cmd`. */
	editorCmdBinary(engineRoot: string): string
	{
		return posix.join(engineRoot, "Engine", "Binaries", "Mac", "UnrealEditor-Cmd");
	}

	/** `<root>/Engine/Binaries/DotNET/UnrealBuildTool/UnrealBuildTool` (the native launcher next to the .dll). */
	unrealBuildTool(engineRoot: string): string
	{
		return posix.join(engineRoot, "Engine", "Binaries", "DotNET", "UnrealBuildTool", "UnrealBuildTool");
	}

	/** `<root>/Engine/Build/BatchFiles/Mac/GenerateProjectFiles.sh`. */
	generateProjectFilesScript(engineRoot: string): string
	{
		return posix.join(engineRoot, "Engine", "Build", "BatchFiles", "Mac", "GenerateProjectFiles.sh");
	}

	/** `<project>/<name> (Mac).xcworkspace`. */
	generatedProjectFile(projectFolder: string, projectName: string): string
	{
		return posix.join(projectFolder, `${projectName} (Mac).xcworkspace`);
	}

	/** `/Users/Shared/Epic Games` (the launcher's default) and `~/Applications` (where this Mac's launcher put UE 5.8). */
	defaultInstallRoots(): string[]
	{
		return ["/Users/Shared/Epic Games", posix.join(this.homeFolder, "Applications")];
	}

	/** `~/Library/Application Support/Epic/UnrealEngineLauncher/LauncherInstalled.dat`. */
	launcherInstalledDataFile(): string
	{
		return posix.join(this.homeFolder, "Library", "Application Support", "Epic", "UnrealEngineLauncher", "LauncherInstalled.dat");
	}

	/** `Build.sh`, the script M1.2a verified. */
	buildProgram(engineRoot: string): string
	{
		return this.buildScript(engineRoot);
	}

	/** `-Name=value` as one argument; Unreal on macOS rebuilds the command line from the argument list itself. */
	optionArgument(name: string, value: string): string
	{
		return `-${name}=${value}`;
	}

	/** The path unchanged. */
	pathArgument(somePath: string): string
	{
		return somePath;
	}
}
