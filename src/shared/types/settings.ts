// Settings the learner can change, stored by the main process in electron-store. The API key is never part of these types.

/** Which loop runs a build quest: chosen per run, forced to the fast editor loop, or forced to the headless loop. */
export type LoopModeSetting = "auto" | "fast" | "headless";

/** Who reviews submitted code. `auto` picks the first available in the order Claude Code, API key, tests only (D11). */
export type ReviewProviderSetting = "auto" | "claude-code" | "anthropic-api" | "tests-only";

/** The app's color theme. Only dark exists in v1; the field is here so a light theme needs no migration. */
export type ThemeSetting = "dark";

/** Everything the Settings screen shows, as read from disk. */
export interface Settings
{
	/** Engine root folder (the one that contains `Engine/`), or null before first run picks one. */
	enginePath: string | null;

	/** Sandbox project folder (the one that contains `Dojo.uproject`), or null before it is created. */
	sandboxPath: string | null;

	/** Loop choice for build quests. */
	loopMode: LoopModeSetting;

	/** Review provider choice. */
	reviewProvider: ReviewProviderSetting;

	/** Model id the Anthropic API provider uses, for example `claude-sonnet-5-5`. */
	modelId: string;

	/** Color theme. */
	theme: ThemeSetting;

	/** True when an API key is stored through safeStorage. The key itself never leaves the main process. */
	hasApiKey: boolean;

	/** When first-run setup finished (ISO 8601), or null while it has not. */
	firstRunCompletedAt: string | null;
}

/** The fields the renderer may change in one `updateSettings` call. `hasApiKey` changes only through `setApiKey` and `clearApiKey`. */
export type SettingsPatch = Partial<Pick<Settings, "enginePath" | "sandboxPath" | "loopMode" | "reviewProvider" | "modelId" | "theme">>;
