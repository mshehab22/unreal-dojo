// Checks that the pipeline's settings view reads the loop mode and MCP port from the app's settings (M1.4b).
import { describe, expect, it } from "vitest";

import type { Settings } from "@shared/types/settings";

import { SettingsServiceUnrealSettings } from "../../src/main/services/unreal/SettingsServiceUnrealSettings";

describe("SettingsServiceUnrealSettings", () =>
{
	it("reads the loop mode and the MCP port as they are now", () =>
	{
		let settings = { enginePath: "/E", sandboxPath: "/S", loopMode: "auto", mcpPort: 8000 } as Settings;
		const view = new SettingsServiceUnrealSettings({ current: () => settings, update: async () => settings, setSandboxPath: () => undefined });

		expect([view.getLoopMode(), view.getMcpPort()]).toEqual(["auto", 8000]);

		settings = { ...settings, loopMode: "headless", mcpPort: 8123 };

		expect([view.getLoopMode(), view.getMcpPort()]).toEqual(["headless", 8123]);
	});
});
