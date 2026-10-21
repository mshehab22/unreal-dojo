// The settings the pipeline needs between calls: the engine and sandbox folders, the loop mode, and the editor's MCP port.
import type { LoopModeSetting } from "@shared/types/settings";

import type { SandboxPathStore } from "./SandboxPathStore";

/** Reads and saves the engine and sandbox folders and reads the fast loop settings; `SettingsServiceUnrealSettings` adapts the app's settings service (A400, A426). */
export interface UnrealSettingsStore extends SandboxPathStore
{
	/** The engine root folder used for the sandbox, or null before setup. */
	getEnginePath(): string | null;

	/** The sandbox project folder, or null before setup. */
	getSandboxPath(): string | null;

	/** The loop mode setting, read at the start of each run. */
	getLoopMode(): LoopModeSetting;

	/** The port the editor's MCP server listens on (A44). */
	getMcpPort(): number;
}
