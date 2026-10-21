// What the app knows about the learner's Unreal install, toolchain, and sandbox, for first-run setup and the Title screen chips.

import type { ReviewProviderStatus } from "./review";
import type { LoopModeSetting } from "./settings";

/** Where an engine install was found. */
export type EngineSource = "default-folder" | "registry" | "manual";

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

/** Result of checking the platform build toolchain (vswhere on Windows, xcode-select on macOS). */
export interface ToolchainCheck
{
	/** True when the toolchain Unreal needs is installed and selected. */
	ok: boolean;

	/** Which tool was asked. */
	tool: "vswhere" | "xcode-select";

	/** Plain-English summary, for example "Xcode 27.1 is selected." */
	message: string;

	/** What to do when `ok` is false. */
	suggestedAction?: string;
}

/** A folder the learner picked for the sandbox, with anything worth warning about before it is used. */
export interface SandboxFolderChoice
{
	/** The folder the sandbox project will be created in. */
	path: string;

	/** Plain-English warnings, for example a Windows path over 100 characters. Empty when there is nothing to say. */
	warnings: string[];
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
}
