// The progress IPC methods wired in M1.6 answer through the real handler table.
import { describe, expect, it } from "vitest";

import { createHandlers } from "../../src/main/ipc/createHandlers";
import { createTestProgressService } from "../support/progressFixtures";

describe("progress IPC handlers", () =>
{
	const { service } = createTestProgressService();
	const handlers = createHandlers({ getAppVersion: () => "1.0.0", getEngineLocator: () => { throw new Error("not used"); }, getContentCatalog: () => { throw new Error("not used"); }, pickFolder: async () => null, progressService: service });

	it("answers getProgress, setPlayerName, and getRules from the service", async () =>
	{
		await handlers.setPlayerName.handle("Mohammad");

		expect((await handlers.getProgress.handle()).playerName).toBe("Mohammad");
		expect((await handlers.getRules.handle()).dailyDueCap).toBe(20);
	});

	it("answers getDrillSummary after a Drill me request", async () =>
	{
		await handlers.queueDrillItem.handle("pattern.observer");

		expect(await handlers.getDrillSummary.handle()).toMatchObject({ dueToday: 1, overflow: 0 });
	});
});
