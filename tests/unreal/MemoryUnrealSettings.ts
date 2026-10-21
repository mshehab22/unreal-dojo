// An in-memory UnrealSettingsStore for tests.
import type { LoopModeSetting } from "@shared/types/settings";

import type { UnrealSettingsStore } from "../../src/main/services/unreal/UnrealSettingsStore";

/** Holds the two folders in fields. */
export class MemoryUnrealSettings implements UnrealSettingsStore
{
	enginePath: string | null;
	sandboxPath: string | null;
	loopMode: LoopModeSetting = "auto";
	mcpPort = 8000;

	/** Takes the starting folders. */
	constructor(enginePath: string | null = null, sandboxPath: string | null = null)
	{
		this.enginePath = enginePath;
		this.sandboxPath = sandboxPath;
	}

	/** The engine folder. */
	getEnginePath(): string | null
	{
		return this.enginePath;
	}

	/** Saves the engine folder. */
	setEnginePath(enginePath: string): void
	{
		this.enginePath = enginePath;
	}

	/** The loop mode. */
	getLoopMode(): LoopModeSetting
	{
		return this.loopMode;
	}

	/** The MCP port. */
	getMcpPort(): number
	{
		return this.mcpPort;
	}

	/** The sandbox folder. */
	getSandboxPath(): string | null
	{
		return this.sandboxPath;
	}

	/** Saves the sandbox folder. */
	setSandboxPath(sandboxPath: string): void
	{
		this.sandboxPath = sandboxPath;
	}
}
