// Checks every path both platform objects produce, and the factory that picks one from process.platform.
import { describe, expect, it } from "vitest";

import { createUnrealPlatform } from "../../src/main/services/unreal/createUnrealPlatform";
import { MacPlatformPaths } from "../../src/main/services/unreal/MacPlatformPaths";
import { MacToolchainChecker } from "../../src/main/services/unreal/MacToolchainChecker";
import { PosixProcessTreeKiller } from "../../src/main/services/unreal/PosixProcessTreeKiller";
import { WindowsEngineRegistry } from "../../src/main/services/unreal/WindowsEngineRegistry";
import { WindowsPlatformPaths } from "../../src/main/services/unreal/WindowsPlatformPaths";
import { WindowsProcessTreeKiller } from "../../src/main/services/unreal/WindowsProcessTreeKiller";
import { WindowsToolchainChecker } from "../../src/main/services/unreal/WindowsToolchainChecker";
import { FakeCommandRunner } from "./FakeCommandRunner";

describe("WindowsPlatformPaths", () =>
{
	const paths = new WindowsPlatformPaths({});
	const engine = "C:\\Program Files\\Epic Games\\UE_5.8";

	it("builds every engine path with backslashes", () =>
	{
		expect(paths.buildPlatform).toBe("Win64");
		expect(paths.buildVersionFile(engine)).toBe("C:\\Program Files\\Epic Games\\UE_5.8\\Engine\\Build\\Build.version");
		expect(paths.buildScript(engine)).toBe("C:\\Program Files\\Epic Games\\UE_5.8\\Engine\\Build\\BatchFiles\\Build.bat");
		expect(paths.editorBinary(engine)).toBe("C:\\Program Files\\Epic Games\\UE_5.8\\Engine\\Binaries\\Win64\\UnrealEditor.exe");
		expect(paths.editorCmdBinary(engine)).toBe("C:\\Program Files\\Epic Games\\UE_5.8\\Engine\\Binaries\\Win64\\UnrealEditor-Cmd.exe");
		expect(paths.unrealBuildTool(engine)).toBe("C:\\Program Files\\Epic Games\\UE_5.8\\Engine\\Binaries\\DotNET\\UnrealBuildTool\\UnrealBuildTool.exe");
		expect(paths.generateProjectFilesScript(engine)).toBe("C:\\Program Files\\Epic Games\\UE_5.8\\Engine\\Build\\BatchFiles\\GenerateProjectFiles.bat");
		expect(paths.generatedProjectFile("C:\\Dojo\\Sandbox", "Dojo")).toBe("C:\\Dojo\\Sandbox\\Dojo.sln");
	});

	it("uses the standard folders when the environment has none", () =>
	{
		expect(paths.defaultInstallRoots()).toEqual(["C:\\Program Files\\Epic Games"]);
		expect(paths.launcherInstalledDataFile()).toBe("C:\\ProgramData\\Epic\\UnrealEngineLauncher\\LauncherInstalled.dat");
	});

	it("follows ProgramFiles and ProgramData from the environment", () =>
	{
		const moved = new WindowsPlatformPaths({ programFiles: "D:\\Apps", programData: "D:\\Data" });

		expect(moved.defaultInstallRoots()).toEqual(["D:\\Apps\\Epic Games"]);
		expect(moved.launcherInstalledDataFile()).toBe("D:\\Data\\Epic\\UnrealEngineLauncher\\LauncherInstalled.dat");
	});

	it("treats paths as the same folder regardless of case, slashes, and a trailing separator", () =>
	{
		expect(paths.caseInsensitivePaths).toBe(true);
		expect(paths.pathKey("C:\\Program Files\\Epic Games\\UE_5.8\\")).toBe(paths.pathKey("c:/program files/epic games/ue_5.8"));
		expect(paths.parentFolder(engine)).toBe("C:\\Program Files\\Epic Games");
		expect(paths.baseName(engine)).toBe("UE_5.8");
		expect(paths.join("C:\\A", "B")).toBe("C:\\A\\B");
	});
});

describe("MacPlatformPaths", () =>
{
	const paths = new MacPlatformPaths("/Users/learner");
	const engine = "/Users/learner/Applications/UE_5.8";

	it("builds every engine path with forward slashes", () =>
	{
		expect(paths.buildPlatform).toBe("Mac");
		expect(paths.buildVersionFile(engine)).toBe("/Users/learner/Applications/UE_5.8/Engine/Build/Build.version");
		expect(paths.buildScript(engine)).toBe("/Users/learner/Applications/UE_5.8/Engine/Build/BatchFiles/Mac/Build.sh");
		expect(paths.editorBinary(engine)).toBe("/Users/learner/Applications/UE_5.8/Engine/Binaries/Mac/UnrealEditor.app/Contents/MacOS/UnrealEditor");
		expect(paths.editorCmdBinary(engine)).toBe("/Users/learner/Applications/UE_5.8/Engine/Binaries/Mac/UnrealEditor-Cmd");
		expect(paths.unrealBuildTool(engine)).toBe("/Users/learner/Applications/UE_5.8/Engine/Binaries/DotNET/UnrealBuildTool/UnrealBuildTool");
		expect(paths.generateProjectFilesScript(engine)).toBe("/Users/learner/Applications/UE_5.8/Engine/Build/BatchFiles/Mac/GenerateProjectFiles.sh");
		expect(paths.generatedProjectFile("/Users/learner/Dojo", "Dojo")).toBe("/Users/learner/Dojo/Dojo (Mac).xcworkspace");
	});

	it("looks in the shared Epic folder and the home Applications folder, and reads the launcher list from Application Support", () =>
	{
		expect(paths.defaultInstallRoots()).toEqual(["/Users/Shared/Epic Games", "/Users/learner/Applications"]);
		expect(paths.launcherInstalledDataFile()).toBe("/Users/learner/Library/Application Support/Epic/UnrealEngineLauncher/LauncherInstalled.dat");
	});

	it("keeps letter case in path keys and drops a trailing slash", () =>
	{
		expect(paths.caseInsensitivePaths).toBe(false);
		expect(paths.pathKey(`${engine}/`)).toBe(engine);
		expect(paths.pathKey(engine)).not.toBe(paths.pathKey(engine.toLowerCase()));
		expect(paths.parentFolder(engine)).toBe("/Users/learner/Applications");
		expect(paths.baseName(engine)).toBe("UE_5.8");
	});
});

describe("build program and argument quoting", () =>
{
	it("calls UnrealBuildTool.exe directly and quotes values verbatim on Windows, with a 100 character sandbox limit", () =>
	{
		const paths = new WindowsPlatformPaths({});

		expect(paths.buildProgram("C:\\UE")).toBe("C:\\UE\\Engine\\Binaries\\DotNET\\UnrealBuildTool\\UnrealBuildTool.exe");
		expect(paths.optionArgument("ExecCmds", "Automation RunTests Dojo; Quit")).toBe("-ExecCmds=\"Automation RunTests Dojo; Quit\"");
		expect(paths.pathArgument("C:\\My Sandbox\\Dojo.uproject")).toBe("\"C:\\My Sandbox\\Dojo.uproject\"");
		expect(paths.verbatimArguments).toBe(true);
		expect(paths.maximumSandboxPathLength).toBe(100);
	});

	it("runs Build.sh and passes arguments whole on macOS, with no path limit", () =>
	{
		const paths = new MacPlatformPaths("/Users/learner");

		expect(paths.buildProgram("/UE")).toBe("/UE/Engine/Build/BatchFiles/Mac/Build.sh");
		expect(paths.optionArgument("ExecCmds", "Automation RunTests Dojo; Quit")).toBe("-ExecCmds=Automation RunTests Dojo; Quit");
		expect(paths.pathArgument("/My Sandbox/Dojo.uproject")).toBe("/My Sandbox/Dojo.uproject");
		expect(paths.verbatimArguments).toBe(false);
		expect(paths.maximumSandboxPathLength).toBeNull();
	});
});

describe("createUnrealPlatform", () =>
{
	const commandRunner = new FakeCommandRunner({});

	it("returns the Windows objects on win32", () =>
	{
		const platform = createUnrealPlatform({ platform: "win32", homeFolder: "C:\\Users\\learner", environment: { ProgramData: "E:\\Data" }, commandRunner });

		expect(platform?.paths).toBeInstanceOf(WindowsPlatformPaths);
		expect(platform?.paths.launcherInstalledDataFile()).toBe("E:\\Data\\Epic\\UnrealEngineLauncher\\LauncherInstalled.dat");
		expect(platform?.toolchainChecker).toBeInstanceOf(WindowsToolchainChecker);
		expect(platform?.engineRegistry).toBeInstanceOf(WindowsEngineRegistry);
		expect(platform?.processTreeKiller).toBeInstanceOf(WindowsProcessTreeKiller);
	});

	it("returns the Mac objects on darwin, with no registry", () =>
	{
		const platform = createUnrealPlatform({ platform: "darwin", homeFolder: "/Users/learner", environment: {}, commandRunner });

		expect(platform?.paths).toBeInstanceOf(MacPlatformPaths);
		expect(platform?.toolchainChecker).toBeInstanceOf(MacToolchainChecker);
		expect(platform?.engineRegistry).toBeNull();
		expect(platform?.processTreeKiller).toBeInstanceOf(PosixProcessTreeKiller);
	});

	it("returns null on any other platform", () =>
	{
		expect(createUnrealPlatform({ platform: "linux", homeFolder: "/home/learner", environment: {}, commandRunner })).toBeNull();
	});
});
