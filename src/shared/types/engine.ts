// What the app knows about the learner's Unreal install, toolchain, and sandbox, for first-run setup and the Title screen chips.

import type { AppError } from "./errors";
import type { ReviewProviderStatus } from "./review";
import type { LoopModeSetting } from "./settings";

/** Where an engine install was found: the Epic launcher's install list, a default install folder, the Windows registry, or the learner's own pick. */
export type EngineSource = "launcher" | "default-folder" | "registry" | "manual";

/** One Unreal Engine install found on this machine. */
export interface EngineInstall
{
	/** Engine root folder (the one that contains `Engine/`). */
	path: string;

	/** Version read from `Engine/Build/Build.version`, for example `5.8.3`. */
	version: string;

	/** How the install was found. */
	source: EngineSource;

	/** True for 5.8 and later, where the fast loop over the editor's MCP server is possible (D09). */
	supportsFastLoop: boolean;
}

/** One missing or broken piece of the build toolchain, explained as an AppError (code `toolchain-missing`). */
export interface ToolchainProblem
{
	/** What is wrong and what to do about it. */
	error: AppError;

	/** True when Unreal cannot build at all until this is fixed. False when builds work but something else does not (the editor window, for example). */
	blocksBuild: boolean;
}

/** Result of checking the platform build toolchain (vswhere on Windows, xcode-select on macOS). */
export interface ToolchainCheck
{
	/** True when nothing blocks a build. Non-blocking problems can still be listed. */
	ok: boolean;

	/** Which tool was asked. */
	tool: "vswhere" | "xcode-select";

	/** Plain-English summary, for example "Xcode 27.1 is selected." */
	message: string;

	/** Version of Visual Studio or Xcode that was found, for example `27.1`. Absent when none was found. */
	toolVersion?: string;

	/** Every problem found, blocking ones first. Empty when everything is in place. */
	problems: ToolchainProblem[];

	/** What to do about the first problem when there is one. */
	suggestedAction?: string;
}

/** A folder the learner picked for the sandbox, with anything worth warning about before it is used. */
export interface SandboxFolderChoice
{
	/** The folder the sandbox project will be created in. */
	path: string;

	/** Plain-English warnings, for example a Windows path over 100 characters. Empty when there is nothing to say. */
	warnings: string[];

	/** Plain-English reasons this folder cannot be used at all, for example inside the engine folder. Absent or empty when the folder can be used. */
	blockers?: string[];
}

/** Final answer of creating or rebuilding the sandbox project. Progress streams on the build progress channel meanwhile. */
export interface SandboxSetupResult
{
	/** True when the template was copied and the first full build passed. */
	ok: boolean;

	/** The sandbox project folder. */
	sandboxPath: string;

	/** Total time of the setup in milliseconds. */
	durationMs: number;

	/** Filtered compiler output when the build failed. */
	compilerOutput: string;

	/** The reason the setup failed, explained in plain English. Absent when it passed. */
	failure?: AppError;
}

/** Everything the Title screen chips and the Settings screen show about the environment, in one call. */
export interface EnvironmentStatus
{
	/** The engine in settings, or null when none is set or it was not found at that path. */
	engine: EngineInstall | null;

	/** Sandbox folder from settings and whether it holds a built project. */
	sandbox: { path: string | null; ready: boolean };

	/** The review provider `auto` or the setting resolves to, or null when none is available beyond tests only. */
	reviewProvider: ReviewProviderStatus | null;

	/** Loop mode from settings. */
	loopMode: LoopModeSetting;

	/** True when the editor is open on the sandbox project and its MCP server answers. */
	editorConnected: boolean;

	/** Why the engine in settings cannot be used (moved, uninstalled, too old). Absent or null when there is no problem or no engine is set. */
	engineProblem?: AppError | null;

	/** The last toolchain check of this session, or null when the check could not run. The first read waits for the check, which the app starts at startup. */
	toolchain?: ToolchainCheck | null;

	/** A notice about the save file (restored from the backup, started fresh, refused). Returned on every read of the session; the screen hides it once the learner dismisses it. Absent or null when there is nothing to say. */
	saveNotice?: AppError | null;
}
