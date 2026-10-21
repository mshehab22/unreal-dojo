// Finds every Unreal Engine install on this machine, reads its version, and reports the build toolchain.
import type { EngineInstall, EngineSource, ToolchainCheck } from "@shared/types/engine";
import type { AppError } from "@shared/types/errors";

import { AppErrorException } from "../../errors/AppErrorException";
import type { EngineRegistry } from "./EngineRegistry";
import { compareVersions, FAST_LOOP_VERSION, formatVersion, MINIMUM_SUPPORTED_VERSION, parseBuildVersion, type EngineVersion } from "./EngineVersion";
import type { FileSystemReader } from "./FileSystemReader";
import { parseLauncherInstalledFile } from "./LauncherInstalledFile";
import type { PlatformPaths } from "./PlatformPaths";
import type { ToolchainChecker } from "./ToolchainChecker";
import { engineFolderInvalid, engineVersionUnsupported, noEngineFound } from "./unrealErrors";

/** Engine folders in the launcher's default layout are named `UE_<version>`. */
const DEFAULT_FOLDER_NAME = /^UE_\d/;

/** What the locator needs from the outside world. Everything is injected so both platforms are unit tested with fakes. */
export interface EngineLocatorDependencies
{
	paths: PlatformPaths;
	fileSystem: FileSystemReader;
	toolchainChecker: ToolchainChecker;

	/** The Windows registry, or null on macOS where there is none. */
	engineRegistry: EngineRegistry | null;
}

/** An engine folder and how it was found, before its version is read. */
interface EngineCandidate
{
	folder: string;
	source: EngineSource;
}

/** Finds engines from the launcher's install list, the Windows registry, and the default install folders; reads manual picks; and runs the toolchain check. */
export class EngineLocator
{
	private readonly dependencies: EngineLocatorDependencies;

	/** Takes the platform paths, file system, toolchain checker, and registry. */
	constructor(dependencies: EngineLocatorDependencies)
	{
		this.dependencies = dependencies;
	}

	/** Returns every supported engine found, newest first, each folder once (the first source that found it wins). Engines older than 5.4 are left out. */
	async findEngines(): Promise<EngineInstall[]>
	{
		const candidates = [...(await this.launcherCandidates()), ...(await this.registryCandidates()), ...(await this.defaultFolderCandidates())];
		const seenKeys = new Set<string>();
		const engines: EngineInstall[] = [];

		for (const candidate of candidates)
		{
			const key = this.dependencies.paths.pathKey(candidate.folder);
			if (seenKeys.has(key)) continue;

			seenKeys.add(key);

			const engine = await this.readEngine(candidate.folder, candidate.source);
			if (engine && engine.supported) engines.push(engine.install);
		}

		return engines.sort((left, right) => compareVersionStrings(right.version, left.version) || left.path.localeCompare(right.path));
	}

	/** Like findEngines, but throws `engine-not-found` when nothing was found, for callers that cannot continue without one. */
	async requireEngines(): Promise<EngineInstall[]>
	{
		const engines = await this.findEngines();
		if (engines.length === 0) throw fromAppError(noEngineFound());

		return engines;
	}

	/** Reads a folder the learner picked. Accepts the engine root or its `Engine` folder. Throws `engine-not-found` or `engine-version-unsupported`. */
	async inspectFolder(folder: string): Promise<EngineInstall>
	{
		const paths = this.dependencies.paths;
		const pickedEngineSubfolder = paths.baseName(folder).toLowerCase() === "engine";
		const engine = (await this.readEngine(folder, "manual")) ?? (pickedEngineSubfolder ? await this.readEngine(paths.parentFolder(folder), "manual") : null);

		if (!engine) throw fromAppError(engineFolderInvalid(folder));
		if (!engine.supported) throw fromAppError(engineVersionUnsupported(engine.install.version, engine.install.path));

		return engine.install;
	}

	/** Runs the platform toolchain check (vswhere on Windows, Xcode on macOS). */
	checkToolchain(): Promise<ToolchainCheck>
	{
		return this.dependencies.toolchainChecker.check();
	}

	/** Reads `Engine/Build/Build.version` under a folder. Returns null when the folder is not an engine. */
	private async readEngine(folder: string, source: EngineSource): Promise<{ install: EngineInstall; supported: boolean } | null>
	{
		const text = await this.dependencies.fileSystem.readTextFile(this.dependencies.paths.buildVersionFile(folder));
		const version: EngineVersion | null = text === null ? null : parseBuildVersion(text);

		if (!version) return null;

		const install: EngineInstall = { path: folder, version: formatVersion(version), source, supportsFastLoop: compareVersions(version, FAST_LOOP_VERSION) >= 0 };

		return { install, supported: compareVersions(version, MINIMUM_SUPPORTED_VERSION) >= 0 };
	}

	/** Engine folders listed in the launcher's LauncherInstalled.dat. */
	private async launcherCandidates(): Promise<EngineCandidate[]>
	{
		const text = await this.dependencies.fileSystem.readTextFile(this.dependencies.paths.launcherInstalledDataFile());
		if (text === null) return [];

		return parseLauncherInstalledFile(text).map((folder) => ({ folder, source: "launcher" }));
	}

	/** Engine folders recorded in the Windows registry. None on macOS. */
	private async registryCandidates(): Promise<EngineCandidate[]>
	{
		const registry = this.dependencies.engineRegistry;
		if (!registry) return [];

		return (await registry.engineFolders()).map((folder) => ({ folder, source: "registry" }));
	}

	/** `UE_*` folders inside each default install root. */
	private async defaultFolderCandidates(): Promise<EngineCandidate[]>
	{
		const { paths, fileSystem } = this.dependencies;
		const candidates: EngineCandidate[] = [];

		for (const root of paths.defaultInstallRoots())
		{
			for (const name of await fileSystem.listFolders(root))
			{
				if (DEFAULT_FOLDER_NAME.test(name)) candidates.push({ folder: paths.join(root, name), source: "default-folder" });
			}
		}

		return candidates;
	}
}

/** Wraps an AppError in the exception the IPC boundary sends to the renderer unchanged. */
function fromAppError(error: AppError): AppErrorException
{
	return new AppErrorException(error.code, error.message, error.suggestedAction, error.detail);
}

/** Compares two `5.8.3` strings. */
function compareVersionStrings(left: string, right: string): number
{
	const [leftMajor = 0, leftMinor = 0, leftPatch = 0] = left.split(".").map(Number);
	const [rightMajor = 0, rightMinor = 0, rightPatch = 0] = right.split(".").map(Number);

	return compareVersions({ major: leftMajor, minor: leftMinor, patch: leftPatch }, { major: rightMajor, minor: rightMinor, patch: rightPatch });
}
