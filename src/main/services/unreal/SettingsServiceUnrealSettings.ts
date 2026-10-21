// The pipeline's view of the app's settings service: the engine and sandbox folders (A400, A426).
import type { LoopModeSetting, Settings, SettingsPatch } from "@shared/types/settings";

import type { UnrealSettingsStore } from "./UnrealSettingsStore";

/** The parts of SettingsService this adapter uses. */
export interface SettingsServiceLike
{
	/** The settings as they are now. */
	current(): Settings;

	/** Applies a patch; an engine path is checked by the engine locator first. */
	update(patch: SettingsPatch): Promise<Settings>;

	/** Records the sandbox folder. */
	setSandboxPath(sandboxPath: string): void;
}

/** Reads and saves the engine and sandbox folders through the settings service, so there is one settings file and one source of truth. */
export class SettingsServiceUnrealSettings implements UnrealSettingsStore
{
	private readonly settings: SettingsServiceLike;

	/** Takes the app's settings service. */
	constructor(settings: SettingsServiceLike)
	{
		this.settings = settings;
	}

	/** The engine folder in settings. */
	getEnginePath(): string | null
	{
		return this.settings.current().enginePath;
	}

	/** The sandbox folder in settings. */
	getSandboxPath(): string | null
	{
		return this.settings.current().sandboxPath;
	}

	/** The loop mode in settings. */
	getLoopMode(): LoopModeSetting
	{
		return this.settings.current().loopMode;
	}

	/** The MCP port in settings. */
	getMcpPort(): number
	{
		return this.settings.current().mcpPort;
	}

	/** Saves the sandbox folder. */
	setSandboxPath(sandboxPath: string): void
	{
		this.settings.setSandboxPath(sandboxPath);
	}

	/** Saves the engine folder the sandbox was created with, through the settings service's own engine check. */
	async setEnginePath(enginePath: string): Promise<void>
	{
		await this.settings.update({ enginePath });
	}
}
