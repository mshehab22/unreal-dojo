// Every Unreal path that differs between Windows and macOS. Nothing outside this folder checks process.platform for Unreal matters (D16).

/** The UBT platform name passed to the build script. */
export type UnrealBuildPlatform = "Win64" | "Mac";

/** Where Unreal's scripts, binaries, and install records live on one operating system. Pure path math; it never touches the disk. */
export interface PlatformPaths
{
	/** UBT platform name, `Win64` or `Mac`. */
	readonly buildPlatform: UnrealBuildPlatform;

	/** True when paths compare without regard to letter case (Windows). */
	readonly caseInsensitivePaths: boolean;

	/** Joins path parts with this platform's separator. */
	join(...parts: string[]): string;

	/** Returns the folder that contains a path. */
	parentFolder(somePath: string): string;

	/** Returns the last part of a path. */
	baseName(somePath: string): string;

	/** Returns a key two spellings of the same folder share, for removing duplicates. */
	pathKey(somePath: string): string;

	/** `Engine/Build/Build.version`, the file the engine version is read from. */
	buildVersionFile(engineRoot: string): string;

	/** `Build.bat` on Windows, `Build.sh` on macOS. */
	buildScript(engineRoot: string): string;

	/** The editor with a window: `UnrealEditor.exe`, or the binary inside `UnrealEditor.app` on macOS. */
	editorBinary(engineRoot: string): string;

	/** The command-line editor used for headless test runs: `UnrealEditor-Cmd.exe` or `UnrealEditor-Cmd`. */
	editorCmdBinary(engineRoot: string): string;

	/** UnrealBuildTool itself, for calls the build script does not cover. */
	unrealBuildTool(engineRoot: string): string;

	/** The script that writes IDE project files for a `.uproject`. */
	generateProjectFilesScript(engineRoot: string): string;

	/** The IDE project file that script writes for a project: a `.sln` on Windows, an `.xcworkspace` on macOS. */
	generatedProjectFile(projectFolder: string, projectName: string): string;

	/** Folders whose `UE_<version>` children are engine installs in the launcher's default layout. */
	defaultInstallRoots(): string[];

	/** The Epic launcher's `LauncherInstalled.dat`, which lists every engine the launcher installed. */
	launcherInstalledDataFile(): string;
}
