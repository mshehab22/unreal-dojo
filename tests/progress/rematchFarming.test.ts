// Rematches cannot be farmed: only scheduled due items surface them, and any sequence of replays on one day pays at most one rematch per quest.
import { describe, expect, it } from "vitest";

import type { RuleQuest } from "../../src/main/services/progress/RuleQuest";
import { createTestProgressService, localMoment, makeQuest } from "../support/progressFixtures";

const earned = makeQuest({ id: "q-earned", terms: ["term.d", "term.e"], patterns: ["pattern.p"], worldId: "world-1", worldOrder: 1 });
const replay = makeQuest({ id: "q-replay", terms: ["term.d"], patterns: ["pattern.p"], worldId: "world-2", worldOrder: 2, xp: 100 });
const map: RuleQuest[] = [earned, replay];

/** A pass of `quest` (not a Submit, so the spree stays out of the numbers). */
function pass(quest: RuleQuest, score = 90)
{
	return { quest, score, passed: true, compiled: true, isSubmit: false };
}

/** A service where both quests are passed, at 09:00 on 21 October. */
async function bothPassed(random: number[] = [0])
{
	const setup = createTestProgressService(localMoment(2026, 10, 21, 9), random);
	await setup.service.recordAttempt(pass(earned), map);
	await setup.service.recordAttempt(pass(replay), map);

	return setup;
}

describe("rematch farming", () =>
{
	it("never creates a rematch from a Drill me item", async () =>
	{
		const { service } = await bothPassed();

		for (let round = 0; round < 4; round++)
		{
			await service.queueDrillItem("term.d");
			const availability = await service.getQuestAvailability(map);

			for (const quest of map)
			{
				expect(availability[quest.id]?.dueForRematch).toBe(false);
				expect((await service.recordAttempt(pass(quest), map)).xp.total).toBe(0);
			}
		}
	});

	it("never creates a repeatable rematch from a hover-injected term that was missed", async () =>
	{
		const { service } = await bothPassed();
		const replays = [replay, earned];
		await service.reviewItem("term.d", 4, { earnedInWorldId: "world-1" });
		await service.reviewItem("term.d", 1);

		for (let hover = 0; hover < 3; hover++) await service.recordTermHover("term.d");
		expect(service.getDueItemIds()).toContain("term.d");

		for (let round = 0; round < 4; round++)
		{
			await service.getQuestAvailability(map);

			for (const quest of replays) expect((await service.recordAttempt(pass(quest), map)).xp.total).toBe(0);
		}
	});

	it("pays at most one rematch per quest per day for any sequence of hovers, queues, misses, map loads, and replays", async () =>
	{
		let rematchesPaid = 0;

		for (let seed = 1; seed <= 40; seed++)
		{
			const { service, clock } = await bothPassed();
			for (const itemId of ["term.d", "term.e", "pattern.p"]) await service.reviewItem(itemId, 4, { earnedInWorldId: "world-1" });

			// The next morning every item is scheduled due, so each quest may earn one rematch today.
			clock.set(localMoment(2026, 10, 22, 7));
			const paidByQuest: Record<string, number> = {};
			let state = seed;
			const nextChoice = (count: number): number =>
			{
				state = (state * 1103515245 + 12345) % 2147483648;

				return state % count;
			};

			for (let step = 0; step < 40; step++)
			{
				const itemId = ["term.d", "term.e", "pattern.p"][nextChoice(3)] ?? "term.d";
				const quest = map[nextChoice(2)] ?? replay;

				switch (nextChoice(5))
				{
					case 0:
						await service.queueDrillItem(itemId);
						break;
					case 1:
						await service.recordTermHover(itemId);
						break;
					case 2:
						await service.reviewItem(itemId, nextChoice(2) === 0 ? 1 : 5);
						break;
					case 3:
						await service.getQuestAvailability(map);
						break;
					default:
					{
						const outcome = await service.recordAttempt(pass(quest), map);
						if (outcome.xp.total > 0) paidByQuest[quest.id] = (paidByQuest[quest.id] ?? 0) + 1;
					}
				}

				clock.set(new Date(clock.now().getTime() + 20 * 60 * 1000));
			}

			for (const paid of Object.values(paidByQuest)) expect(paid, `seed ${seed}`).toBeLessThanOrEqual(1);
			rematchesPaid += Object.values(paidByQuest).length;
		}

		// The sequences must actually reach rematches, or the bound above proves nothing.
		expect(rematchesPaid).toBeGreaterThan(0);
	});
});
