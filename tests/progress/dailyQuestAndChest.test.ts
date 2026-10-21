// Daily quest: three offers, one choice per day, completion, chest contents, month badge, nothing lost on missed days.
import { describe, expect, it } from "vitest";

import { ChestRules } from "../../src/main/services/progress/ChestRules";
import { createNewProgress } from "../../src/main/services/progress/createNewProgress";
import { DailyQuestService } from "../../src/main/services/progress/DailyQuestService";
import { STUDIO_COSMETICS } from "../../src/main/services/progress/rules";
import { localMoment } from "../support/progressFixtures";
import { SequenceRandom } from "../support/SequenceRandom";

const daily = new DailyQuestService();
const chest = new ChestRules();
const candidates = { conceptQuestIds: ["concept-a", "concept-b"], shortBuildQuestIds: ["build-a"] };
const empty = { date: "2026-10-20", offered: [], done: false, monthBadges: [], completedDates: [] };

describe("DailyQuestService", () =>
{
	it("offers a drill, a concept, and a short build on a new day", () =>
	{
		const state = daily.refresh(empty, localMoment(2026, 10, 21), candidates, new SequenceRandom([0.6]));

		expect(state.date).toBe("2026-10-21");
		expect(state.offered).toEqual([{ kind: "drill" }, { kind: "concept", questId: "concept-b" }, { kind: "build", questId: "build-a" }]);
	});

	it("keeps the same offers within the day", () =>
	{
		const state = daily.refresh(empty, localMoment(2026, 10, 21, 8), candidates, new SequenceRandom([0]));

		expect(daily.refresh(state, localMoment(2026, 10, 21, 23), candidates, new SequenceRandom([0.9]))).toBe(state);
	});

	it("allows one choice per calendar day", () =>
	{
		const state = daily.refresh(empty, localMoment(2026, 10, 21), candidates, new SequenceRandom([0]));
		const chosen = daily.choose(state, 1);

		expect(chosen?.chosen).toBe(1);
		expect(chosen && daily.choose(chosen, 0)).toBeNull();
		expect(daily.choose(state, 5)).toBeNull();
	});

	it("completes only the chosen offer, once", () =>
	{
		const moment = localMoment(2026, 10, 21);
		const chosen = daily.choose(daily.refresh(empty, moment, candidates, new SequenceRandom([0])), 0);
		if (!chosen) throw new Error("expected a choice");

		expect(daily.complete(chosen, moment, "concept", "concept-a").completedNow).toBe(false);

		const done = daily.complete(chosen, moment, "drill");
		expect(done.completedNow).toBe(true);
		expect(daily.complete(done.state, moment, "drill").completedNow).toBe(false);
	});

	it("earns a month badge when every day of the month was done, and missing days costs nothing", () =>
	{
		const februaryDays = Array.from({ length: 27 }, (_, index) => `2027-02-${String(index + 1).padStart(2, "0")}`);
		const lastDay = localMoment(2027, 2, 28);
		const state = { date: "2027-02-28", offered: [{ kind: "drill" as const }], chosen: 0, done: false, monthBadges: [], completedDates: februaryDays };

		expect(daily.complete(state, lastDay, "drill").monthBadge).toBe("2027-02");

		const missedOne = { ...state, completedDates: februaryDays.slice(1) };
		const result = daily.complete(missedOne, lastDay, "drill");
		expect(result.monthBadge).toBeUndefined();
		expect(result.completedNow).toBe(true);
	});
});

describe("ChestRules", () =>
{
	it("can hold a freeze, armor, a Seer Stone, a studio cosmetic, or an XP potion", () =>
	{
		expect(chest.possibleRewards(createNewProgress(localMoment(2026, 10, 21)))).toEqual(["freeze", "armor", "seer-stone", "studio-cosmetic", "xp-potion"]);
	});

	it("never gives something the learner holds the most of", () =>
	{
		const progress = createNewProgress(localMoment(2026, 10, 21));
		progress.streak.freezes = 2;
		progress.spree.armor = 2;
		progress.seerStones = 2;
		progress.studio.cosmetics = [...STUDIO_COSMETICS];

		expect(chest.possibleRewards(progress)).toEqual(["xp-potion"]);
		expect(chest.roll(progress, new SequenceRandom([0.99]))).toBe("xp-potion");
	});

	it("rolls with the injected randomness", () =>
	{
		const progress = createNewProgress(localMoment(2026, 10, 21));

		expect(chest.roll(progress, new SequenceRandom([0]))).toBe("freeze");
		expect(chest.roll(progress, new SequenceRandom([0.5]))).toBe("seer-stone");
	});
});
