// Checks every way the engine locator finds an engine, on both platforms, and every way it explains a failure.
import { describe, expect, it } from "vitest";

import type { ToolchainCheck } from "@shared/types/engine";

import { AppErrorException } from "../../src/main/errors/AppErrorException";
import type { EngineRegistry } from "../../src/main/services/unreal/EngineRegistry";
import { EngineLocator } from "../../src/main/services/unreal/EngineLocator";
import { MacPlatformPaths } from "../../src/main/services/unreal/MacPlatformPaths";
import type { PlatformPaths } from "../../src/main/services/unreal/PlatformPaths";
import { WindowsPlatformPaths } from "../../src/main/services/unreal/WindowsPlatformPaths";
import { FakeFileSystemReader } from "./FakeFileSystemReader";

const HOME = "/Users/learner";
const MAC_LAUNCHER_FILE = `${HOME}/Library/Application Support/Epic/UnrealEngineLauncher/LauncherInstalled.dat`;
const WINDOWS_LAUNCHER_FILE = "C:\\ProgramData\\Epic\\UnrealEngineLauncher\\LauncherInstalled.dat";

/** A healthy toolchain answer the fake checker returns. */
const HEALTHY_TOOLCHAIN: ToolchainCheck = { ok: true, tool: "xcode-select", message: "Xcode 27.1 is selected.", toolVersion: "27.1", problems: [] };

/** Returns Build.version text for a version, shaped like Epic's file. */
function buildVersion(major: number, minor: number, patch: number): string
{
	return JSON.stringify({ MajorVersion: major, MinorVersion: minor, PatchVersion: patch, Changelist: 58210709, BranchName: "++UE5+Release" });
}

/** Returns LauncherInstalled.dat text listing apps as [AppName, InstallLocation] pairs. */
function launcherFile(entries: [string, string][]): string
{
	return JSON.stringify({ InstallationList: entries.map(([appName, installLocation]) => ({ AppName: appName, InstallLocation: installLocation, NamespaceId: "ue" })) });
}

/** A registry that answers a fixed list. */
function fakeRegistry(folders: string[]): EngineRegistry
{
	return { engineFolders: async () => folders };
}

/** Builds a locator over the given platform paths, fake disk, and registry. */
function createLocator(paths: PlatformPaths, fileSystem: FakeFileSystemReader, engineRegistry: EngineRegistry | null = null): EngineLocator
{
	return new EngineLocator({ paths, fileSystem, engineRegistry, toolchainChecker: { check: async () => HEALTHY_TOOLCHAIN } });
}

/** Runs a promise that should reject with an AppErrorException and returns its AppError. */
async function expectAppError(promise: Promise<unknown>, code: string)
{
	const error = await promise.then(() => null, (rejection: unknown) => rejection);

	expect(error).toBeInstanceOf(AppErrorException);

	const appError = (error as AppErrorException).appError;
	expect(appError.code).toBe(code);

	return appError;
}

describe("EngineLocator on macOS", () =>
{
	const paths = new MacPlatformPaths(HOME);

	it("finds an engine from the launcher list and skips the plugin entries that share its folder (the real layout on this Mac)", async () =>
	{
		const engineFolder = `${HOME}/Applications/UE_5.8`;
		const fileSystem = new FakeFileSystemReader({
			[MAC_LAUNCHER_FILE]: launcherFile([["UE_5.8", engineFolder], ["QuixelBridge_5.8", engineFolder], ["FabPlugin_5.8", engineFolder]]),
			[`${engineFolder}/Engine/Build/Build.version`]: buildVersion(5, 8, 3),
		}, { [`${HOME}/Applications`]: ["UE_5.8", "Xcode.app"] });

		const engines = await createLocator(paths, fileSystem).findEngines();

		expect(engines).toEqual([{ path: engineFolder, version: "5.8.3", source: "launcher", supportsFastLoop: true }]);
	});

	it("finds engines in the default folders when the launcher list is missing, newest first", async () =>
	{
		const fileSystem = new FakeFileSystemReader({
			"/Users/Shared/Epic Games/UE_5.5/Engine/Build/Build.version": buildVersion(5, 5, 4),
			[`${HOME}/Applications/UE_5.8/Engine/Build/Build.version`]: buildVersion(5, 8, 1),
		}, { "/Users/Shared/Epic Games": ["UE_5.5", "Launcher"], [`${HOME}/Applications`]: ["UE_5.8"] });

		const engines = await createLocator(paths, fileSystem).findEngines();

		expect(engines.map((engine) => [engine.version, engine.source, engine.supportsFastLoop])).toEqual([["5.8.1", "default-folder", true], ["5.5.4", "default-folder", false]]);
	});

	it("does not look for a registry on macOS", async () =>
	{
		const engines = await createLocator(paths, new FakeFileSystemReader({}), null).findEngines();

		expect(engines).toEqual([]);
	});

	it("leaves out engines older than 5.4 and folders without a readable Build.version", async () =>
	{
		const fileSystem = new FakeFileSystemReader({
			"/Users/Shared/Epic Games/UE_5.3/Engine/Build/Build.version": buildVersion(5, 3, 2),
			"/Users/Shared/Epic Games/UE_5.6/Engine/Build/Build.version": "{ not json",
			"/Users/Shared/Epic Games/UE_5.7/Engine/Build/Build.version": JSON.stringify({ MajorVersion: 5 }),
		}, { "/Users/Shared/Epic Games": ["UE_5.3", "UE_5.6", "UE_5.7", "UE_5.9"] });

		expect(await createLocator(paths, fileSystem).findEngines()).toEqual([]);
	});

	it("reads files that start with a byte order mark", async () =>
	{
		const engineFolder = `${HOME}/Applications/UE_5.8`;
		const fileSystem = new FakeFileSystemReader({
			[MAC_LAUNCHER_FILE]: `\uFEFF${launcherFile([["UE_5.8", engineFolder]])}`,
			[`${engineFolder}/Engine/Build/Build.version`]: `\uFEFF${buildVersion(5, 8, 3)}`,
		});

		expect((await createLocator(paths, fileSystem).findEngines()).map((engine) => engine.version)).toEqual(["5.8.3"]);
	});

	it("ignores a launcher list that is not JSON or has no installation list", async () =>
	{
		const brokenList = new FakeFileSystemReader({ [MAC_LAUNCHER_FILE]: "garbage" });
		const emptyObject = new FakeFileSystemReader({ [MAC_LAUNCHER_FILE]: "{}" });

		expect(await createLocator(paths, brokenList).findEngines()).toEqual([]);
		expect(await createLocator(paths, emptyObject).findEngines()).toEqual([]);
	});

	it("throws engine-not-found from requireEngines when nothing is installed", async () =>
	{
		const error = await expectAppError(createLocator(paths, new FakeFileSystemReader({})).requireEngines(), "engine-not-found");

		expect(error.message).toBe("No Unreal Engine install was found on this computer.");
		expect(error.suggestedAction).toMatch(/Epic Games Launcher/);
	});

	it("passes the toolchain check through", async () =>
	{
		expect(await createLocator(paths, new FakeFileSystemReader({})).checkToolchain()).toEqual(HEALTHY_TOOLCHAIN);
	});
});

describe("EngineLocator on Windows", () =>
{
	const paths = new WindowsPlatformPaths({});

	it("collects the launcher list, the registry, and the default folder, listing each folder once with the first source that found it", async () =>
	{
		const fileSystem = new FakeFileSystemReader({
			[WINDOWS_LAUNCHER_FILE]: launcherFile([["UE_5.8", "C:\\Program Files\\Epic Games\\UE_5.8"]]),
			"C:\\Program Files\\Epic Games\\UE_5.8\\Engine\\Build\\Build.version": buildVersion(5, 8, 3),
			"C:\\Program Files\\Epic Games\\UE_5.6\\Engine\\Build\\Build.version": buildVersion(5, 6, 1),
			"D:\\Source\\UnrealEngine\\Engine\\Build\\Build.version": buildVersion(5, 7, 0),
		}, { "C:\\Program Files\\Epic Games": ["UE_5.8", "UE_5.6", "Launcher"] });
		const registry = fakeRegistry(["c:\\program files\\epic games\\ue_5.8\\", "D:\\Source\\UnrealEngine"]);

		const engines = await createLocator(paths, fileSystem, registry).findEngines();

		expect(engines.map((engine) => [engine.path, engine.version, engine.source])).toEqual([
			["C:\\Program Files\\Epic Games\\UE_5.8", "5.8.3", "launcher"],
			["D:\\Source\\UnrealEngine", "5.7.0", "registry"],
			["C:\\Program Files\\Epic Games\\UE_5.6", "5.6.1", "default-folder"],
		]);
	});

	it("finds an engine from the registry alone", async () =>
	{
		const fileSystem = new FakeFileSystemReader({ "E:\\Epic\\UE_5.4\\Engine\\Build\\Build.version": buildVersion(5, 4, 4) });

		const engines = await createLocator(paths, fileSystem, fakeRegistry(["E:\\Epic\\UE_5.4"])).findEngines();

		expect(engines).toEqual([{ path: "E:\\Epic\\UE_5.4", version: "5.4.4", source: "registry", supportsFastLoop: false }]);
	});

	it("reads only the expected files", async () =>
	{
		const fileSystem = new FakeFileSystemReader({}, { "C:\\Program Files\\Epic Games": ["UE_5.8"] });

		await createLocator(paths, fileSystem, fakeRegistry([])).findEngines();

		expect(fileSystem.readPaths).toEqual([WINDOWS_LAUNCHER_FILE, "C:\\Program Files\\Epic Games\\UE_5.8\\Engine\\Build\\Build.version"]);
	});
});

describe("EngineLocator manual pick", () =>
{
	const paths = new MacPlatformPaths(HOME);
	const fileSystem = new FakeFileSystemReader({
		"/Volumes/Games/UE_5.8/Engine/Build/Build.version": buildVersion(5, 8, 3),
		"/Volumes/Games/UE_5.2/Engine/Build/Build.version": buildVersion(5, 2, 1),
	});
	const locator = createLocator(paths, fileSystem);

	it("accepts the engine root", async () =>
	{
		expect(await locator.inspectFolder("/Volumes/Games/UE_5.8")).toEqual({ path: "/Volumes/Games/UE_5.8", version: "5.8.3", source: "manual", supportsFastLoop: true });
	});

	it("accepts the Engine folder inside it and answers the root", async () =>
	{
		expect((await locator.inspectFolder("/Volumes/Games/UE_5.8/Engine")).path).toBe("/Volumes/Games/UE_5.8");
	});

	it("explains a folder that is not an engine", async () =>
	{
		const error = await expectAppError(locator.inspectFolder("/Users/learner/Documents"), "engine-not-found");

		expect(error.message).toBe("That folder does not look like an Unreal Engine install.");
		expect(error.detail).toContain("/Users/learner/Documents");
	});

	it("explains an engine that is too old", async () =>
	{
		const error = await expectAppError(locator.inspectFolder("/Volumes/Games/UE_5.2"), "engine-version-unsupported");

		expect(error.message).toBe("Unreal Engine 5.2.1 is too old for Unreal Dojo, which needs 5.4 or later.");
	});

	it("accepts a Windows Engine folder too", async () =>
	{
		const windowsFileSystem = new FakeFileSystemReader({ "D:\\UE_5.8\\Engine\\Build\\Build.version": buildVersion(5, 8, 0) });
		const windowsLocator = createLocator(new WindowsPlatformPaths({}), windowsFileSystem);

		expect((await windowsLocator.inspectFolder("D:\\UE_5.8\\Engine")).path).toBe("D:\\UE_5.8");
	});
});
