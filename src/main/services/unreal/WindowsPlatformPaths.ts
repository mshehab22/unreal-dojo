// Unreal paths on Windows.
import { win32 } from "node:path";

import type { PlatformPaths, UnrealBuildPlatform } from "./PlatformPaths";

/** The environment values Windows paths depend on. Missing values fall back to the standard folders. */
export interface WindowsEnvironment
{
	/** `%ProgramFiles%`, usually `C:\Program Files`. */
	programFiles?: string;

	/** `%ProgramData%`, usually `C:\ProgramData`. */
	programData?: string;
}

/** PlatformPaths for Windows. Uses win32 path rules even when run on a Mac, so it can be unit tested anywhere. */
export class WindowsPlatformPaths implements PlatformPaths
{
	readonly buildPlatform: UnrealBuildPlatform = "Win64";
	readonly caseInsensitivePaths = true;

	private readonly programFiles: string;
	private readonly programData: string;

	/** Takes the two environment folders the launcher installs into and records to. */
	constructor(environment: WindowsEnvironment)
	{
		this.programFiles = environment.programFiles ?? "C:\\Program Files";
		this.programData = environment.programData ?? "C:\\ProgramData";
	}

	/** Joins with backslashes. */
	join(...parts: string[]): string
	{
		return win32.join(...parts);
	}

	/** Returns the containing folder. */
	parentFolder(somePath: string): string
	{
		return win32.dirname(somePath);
	}

	/** Returns the last path part. */
	baseName(somePath: string): string
	{
		return win32.basename(somePath);
	}

	/** Lower-cases and normalizes, since `C:\Epic` and `c:\epic\` are the same folder on Windows. */
	pathKey(somePath: string): string
	{
		return win32.normalize(somePath).replace(/\\+$/, "").toLowerCase();
	}

	/** `<root>\Engine\Build\Build.version`. */
	buildVersionFile(engineRoot: string): string
	{
		return win32.join(engineRoot, "Engine", "Build", "Build.version");
	}

	/** `<root>\Engine\Build\BatchFiles\Build.bat`. */
	buildScript(engineRoot: string): string
	{
		return win32.join(engineRoot, "Engine", "Build", "BatchFiles", "Build.bat");
	}

	/** `<root>\Engine\Binaries\Win64\UnrealEditor.exe`. */
	editorBinary(engineRoot: string): string
	{
		return win32.join(engineRoot, "Engine", "Binaries", "Win64", "UnrealEditor.exe");
	}

	/** `<root>\Engine\Binaries\Win64\UnrealEditor-Cmd.exe`. */
	editorCmdBinary(engineRoot: string): string
	{
		return win32.join(engineRoot, "Engine", "Binaries", "Win64", "UnrealEditor-Cmd.exe");
	}

	/** `<root>\Engine\Binaries\DotNET\UnrealBuildTool\UnrealBuildTool.exe`. */
	unrealBuildTool(engineRoot: string): string
	{
		return win32.join(engineRoot, "Engine", "Binaries", "DotNET", "UnrealBuildTool", "UnrealBuildTool.exe");
	}

	/** `<root>\Engine\Build\BatchFiles\GenerateProjectFiles.bat`. */
	generateProjectFilesScript(engineRoot: string): string
	{
		return win32.join(engineRoot, "Engine", "Build", "BatchFiles", "GenerateProjectFiles.bat");
	}

	/** `<project>\<name>.sln`. */
	generatedProjectFile(projectFolder: string, projectName: string): string
	{
		return win32.join(projectFolder, `${projectName}.sln`);
	}

	/** `%ProgramFiles%\Epic Games`, the launcher's default install folder. */
	defaultInstallRoots(): string[]
	{
		return [win32.join(this.programFiles, "Epic Games")];
	}

	/** `%ProgramData%\Epic\UnrealEngineLauncher\LauncherInstalled.dat`. */
	launcherInstalledDataFile(): string
	{
		return win32.join(this.programData, "Epic", "UnrealEngineLauncher", "LauncherInstalled.dat");
	}
}
