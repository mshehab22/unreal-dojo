// Checks that every IPC channel name is unique and namespaced, so two DojoApi methods can never share one.
import { describe, expect, it } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc";

describe("IPC_CHANNELS", () =>
{
	it("gives every method its own dojo: channel", () =>
	{
		const channelNames = Object.values(IPC_CHANNELS);

		expect(new Set(channelNames).size).toBe(channelNames.length);

		for (const channelName of channelNames) expect(channelName).toMatch(/^dojo:/);
	});
});
