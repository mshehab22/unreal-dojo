// The settings file's layout, its defaults, and how each stored value is checked when it is read back.
import { z } from "zod";

import type { Settings } from "@shared/types/settings";

/** The settings file keys. `apiKeyEncrypted` holds the safeStorage bytes as base64; it never leaves the main process. */
export const STORED_KEYS = {
	enginePath: "enginePath",
	sandboxPath: "sandboxPath",
	loopMode: "loopMode",
	reviewProvider: "reviewProvider",
	modelId: "modelId",
	theme: "theme",
	mcpPort: "mcpPort",
	firstRunCompletedAt: "firstRunCompletedAt",
	apiKeyEncrypted: "apiKeyEncrypted",
} as const;

/** Model id used until the learner picks another (the ai-review spec's default). */
export const DEFAULT_MODEL_ID = "claude-sonnet-5-5";

/** The editor MCP server's default port (A44). */
export const DEFAULT_MCP_PORT = 8000;

/** Settings on a fresh install. */
export const DEFAULT_SETTINGS: Omit<Settings, "hasApiKey"> = {
	enginePath: null,
	sandboxPath: null,
	loopMode: "auto",
	reviewProvider: "auto",
	modelId: DEFAULT_MODEL_ID,
	theme: "dark",
	mcpPort: DEFAULT_MCP_PORT,
	firstRunCompletedAt: null,
};

/** One check per stored setting. A value that fails its check (hand-edited, from an older version) falls back to its default alone. */
const STORED_VALUE_SCHEMAS: { [Key in keyof typeof DEFAULT_SETTINGS]: z.ZodType<(typeof DEFAULT_SETTINGS)[Key]> } = {
	enginePath: z.string().min(1).nullable(),
	sandboxPath: z.string().min(1).nullable(),
	loopMode: z.enum(["auto", "fast", "headless"]),
	reviewProvider: z.enum(["auto", "claude-code", "anthropic-api", "tests-only"]),
	modelId: z.string().min(1),
	theme: z.enum(["dark"]),
	mcpPort: z.int().min(1024).max(65535),
	firstRunCompletedAt: z.iso.datetime().nullable(),
};

/** Reads the stored values into settings, field by field, using the default for anything missing or invalid. */
export function readStoredSettings(stored: Record<string, unknown>): Omit<Settings, "hasApiKey">
{
	const settings: Record<string, unknown> = { ...DEFAULT_SETTINGS };

	for (const [key, schema] of Object.entries(STORED_VALUE_SCHEMAS))
	{
		if (!(key in stored)) continue;

		const result = schema.safeParse(stored[key]);
		if (result.success) settings[key] = result.data;
	}

	// Every key was filled from DEFAULT_SETTINGS and replaced only by a value that passed that key's schema.
	return settings as Omit<Settings, "hasApiKey">;
}

/** Tells whether a stored encrypted key is present and non-empty base64 text. */
export function hasStoredApiKey(stored: Record<string, unknown>): boolean
{
	const value = stored[STORED_KEYS.apiKeyEncrypted];

	return typeof value === "string" && value.length > 0;
}
