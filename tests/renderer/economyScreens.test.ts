// M3.3 renderer paths: the spree stake wording, where a daily offer opens and the month count, the streak day, and the fake's economy flows (Seer Stone, the daily chest, the solution fixture).
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { ItemResponse } from "@shared/types/progress";

import { ContentLoader } from "../../src/main/services/content";
import { FakeDojoApi } from "../../src/renderer/src/data/fake/FakeDojoApi";
import { recordStreakDay } from "../../src/renderer/src/data/fake/FakeQuestLedger";
import { rulesFixture } from "../../src/renderer/src/data/fake/fixtures/rulesFixture";
import { dailyOfferTarget, monthProgress } from "../../src/renderer/src/lib/dailyQuestDisplay";
import { spreeStakeFor } from "../../src/renderer/src/lib/spreeStake";
import { buildFakeWorldFixture } from "../../tools/fake/buildFakeWorldFixture";

/** A stake with the rules' numbers. */
function stake(overrides: Partial<Parameters<typeof spreeStakeFor>[0]>)
{
	return spreeStakeFor({ questPassed: false, submitsSoFar: 0, spree: { current: 4, armor: 1 }, bonusThreshold: 5, bonusShare: 0.05, ...overrides });
}

describe("spreeStakeFor (A1396)", () =>
{
	it("says a first try counts and reaching the threshold turns the bonus on, with armor covering a miss", () =>
	{
		expect(stake({})).toEqual({ counts: true, headline: "First try counts: spree 4 to 5", detail: "A pass on this Submit makes it 5 with the spree bonus (+5% XP). A miss is absorbed by armor (1 held)." });
	});

	it("names the bonus threshold below it and says a miss resets without armor, keeping the best", () =>
	{
		expect(stake({ spree: { current: 2, armor: 0 } }).detail).toBe("A pass on this Submit makes it 3; the bonus starts at 5. A miss resets it to 0; your best stays.");
	});

	it("mentions no miss on a spree of 0, since there is nothing to lose", () =>
	{
		expect(stake({ spree: { current: 0, armor: 1 } }).detail).toBe("A pass on this Submit makes it 1; the bonus starts at 5.");
	});

	it("does not count after the first Submit or once passed", () =>
	{
		expect(stake({ submitsSoFar: 1 })).toMatchObject({ counts: false, headline: "Spree 4" });
		expect(stake({ questPassed: true })).toMatchObject({ counts: false, detail: "Passed already, so Submits here leave your spree alone." });
	});
});

describe("daily quest display (A1394)", () =>
{
	it("opens a drill offer as today's due drill and a quest offer as its quest", () =>
	{
		expect(dailyOfferTarget({ kind: "drill" })).toEqual({ id: "drill", parameters: { kind: "due" } });
		expect(dailyOfferTarget({ kind: "concept", questId: "q1" })).toEqual({ id: "quest", parameters: { id: "q1" } });
		expect(dailyOfferTarget({ kind: "build" })).toBeNull();
	});

	it("counts the days of the state's month done, once each, and the month's length", () =>
	{
		const daily = { date: "2027-02-14", offered: [], done: false, monthBadges: [], completedDates: ["2027-01-31", "2027-02-01", "2027-02-02", "2027-02-02"] };

		expect(monthProgress(daily)).toEqual({ done: 2, daysInMonth: 28 });
	});
});

describe("fake streak day", () =>
{
	it("grows once per day and reports a milestone the first time only", () =>
	{
		const rules = rulesFixture();
		const yesterday = new Date(Date.now() - 86_400_000 * 2).toISOString();
		const first = recordStreakDay({ count: 6, lastActivityAt: yesterday, freezes: 0, milestones: [] }, rules);

		expect(first.streak.count).toBe(7);
		expect(first.milestoneReached).toBe(7);
		expect(recordStreakDay(first.streak, rules)).toEqual({ streak: first.streak, milestoneReached: undefined });
		expect(recordStreakDay({ count: 6, lastActivityAt: yesterday, freezes: 0, milestones: [7] }, rules).milestoneReached).toBeUndefined();
	});
});

describe("fake economy flows (A1399)", () =>
{
	it("keeps only a quest's own files in the solution fixture", async () =>
	{
		const content = await new ContentLoader(resolve("content")).load();
		const fixture = buildFakeWorldFixture(content, { "f1-training-dummy": { "DojoF1TrainingDummy.h": "header", "f1-training-dummy.Test.cpp": "test" } });

		expect(fixture.solutions).toEqual({ "f1-training-dummy": { "DojoF1TrainingDummy.h": "header" } });
	});

	it("views a solution after two failed submits with a Seer Stone, then again for free", async () =>
	{
		const fake = new FakeDojoApi("economy");
		const quest = await fake.getQuest("f1-training-dummy");
		if (quest.kind !== "build") throw new Error("build quest expected");
		const starters = Object.fromEntries(quest.files.map((file) => [file.name, file.starter]));

		await expect(fake.viewSolution(quest.id, true)).rejects.toMatchObject({ code: "quest-locked" });
		await fake.submitQuest({ runId: "a", questId: quest.id, files: starters });
		await fake.submitQuest({ runId: "b", questId: quest.id, files: starters });

		const viewing = await fake.viewSolution(quest.id, true);
		const again = await fake.viewSolution(quest.id, false);

		expect(Object.keys(viewing.files).sort()).toEqual(quest.files.map((file) => file.name).sort());
		expect(viewing).toMatchObject({ stoneSpent: true, seerStonesAfter: 0, xpForfeited: false, alreadyViewed: false });
		expect(viewing.rematchDueAt).not.toBeNull();
		expect(again).toMatchObject({ stoneSpent: false, seerStonesAfter: 0, alreadyViewed: true, rematchDueAt: null });
		expect((await fake.getProgress()).rematches[quest.id]).toBe(viewing.rematchDueAt);
	}, 20_000);

	it("keeps the chest of a finished daily concept offer, and the pass reaches the 7 day milestone", async () =>
	{
		const fake = new FakeDojoApi("economy");
		const quest = await fake.getQuest("f1-uobject-and-actor");
		if (quest.kind !== "concept") throw new Error("concept quest expected");

		const answers: ItemResponse[] = quest.questions.map((question) =>
		{
			if (question.type === "multiple-choice") return { kind: "choice", choice: String(question.answerIndex) };
			if (question.type === "which-pattern") return { kind: "choice", choice: question.answer };
			if (question.type === "fill-blank") return { kind: "text", text: question.acceptedAnswers[0] ?? "" };
			if (question.type === "spot-the-bug") return { kind: "choice", choice: String(question.bugLine) };

			return { kind: "text", text: question.modelAnswer };
		});

		await fake.chooseDailyOffer(1);
		const { outcome } = await fake.submitConcept({ questId: quest.id, prediction: null, answers });
		const daily = await fake.getDailyQuest();

		expect(outcome.attempt.passed).toBe(true);
		expect(outcome.chest).toBe("seer-stone");
		expect(daily).toMatchObject({ done: true, chest: "seer-stone" });
		expect(outcome.streak).toEqual({ count: 7, milestoneReached: 7 });
	});

	it("serves World 1 as ready to test out in the economy scenario", async () =>
	{
		const statuses = await new FakeDojoApi("economy").getTestOutStatus();

		expect(statuses["foundations/objects-and-reflection"]).toEqual({ eligible: true, testedOut: false });
	});
});
