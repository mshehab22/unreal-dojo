// M2.2c: the drill finish card's words, and the fake's Tests-only drill, keep self-checked explain items out of the score and out of "due" (A801, A940).
import { describe, expect, it } from "vitest";

import { drillReward } from "../../src/renderer/src/data/fake/drillReward";
import { FakeDojoApi } from "../../src/renderer/src/data/fake/FakeDojoApi";
import { drillSummaryCopy } from "../../src/renderer/src/screens/quests/drill/drillSummaryCopy";

describe("drillSummaryCopy", () =>
{
	it("says nothing is due when every graded item was right, and names the self-checked ones plainly", () =>
	{
		const copy = drillSummaryCopy({ correctCount: 5, totalCount: 5, selfCheckedCount: 2 });

		expect(copy.headline).toEqual({ kind: "score", correct: 5, total: 5 });
		expect(copy.dueLine).toBeNull();
		expect(copy.selfCheckedLine).toMatch(/^2 explained in your own words, not graded\. Compare them with the model answers; they stay in your drills until a reviewer can grade them\./);
		expect(drillSummaryCopy({ correctCount: 5, totalCount: 5, selfCheckedCount: 1 }).selfCheckedLine).toMatch(/Compare it with the model answer; it stays in your drills until a reviewer can grade it\./);
	});

	it("counts only graded misses as due", () =>
	{
		expect(drillSummaryCopy({ correctCount: 3, totalCount: 5, selfCheckedCount: 1 }).dueLine).toMatch(/^2 items are due for review/);
		expect(drillSummaryCopy({ correctCount: 4, totalCount: 5, selfCheckedCount: 0 }).dueLine).toMatch(/^One item is due/);
		expect(drillSummaryCopy({ correctCount: 4, totalCount: 5, selfCheckedCount: 0 }).selfCheckedLine).toBeNull();
	});

	it("shows how many were explained instead of 0/0 when nothing was graded (A940)", () =>
	{
		const copy = drillSummaryCopy({ correctCount: 0, totalCount: 0, selfCheckedCount: 3 });

		expect(copy.headline).toEqual({ kind: "explained", count: 3 });
		expect(copy.dueLine).toBeNull();
	});
});

describe("the fake's Tests-only drill matches the progress service (A801)", () =>
{
	it("self-checks the explain item, keeps its due time, and leaves it out of both counts", async () =>
	{
		const fake = new FakeDojoApi("quests");
		await fake.updateSettings({ reviewProvider: "tests-only" });
		const session = await fake.startDrill({ kind: "due" });
		const explain = session.items.find((entry) => entry.item.source !== "parsons" && entry.item.question.type === "explain-in-one-sentence");

		if (!explain) throw new Error("the fake drill holds an explain item");

		const dueBefore = (await fake.getProgress()).schedule[explain.itemId];

		for (const entry of session.items)
		{
			const result = await fake.answerDrillItem({ sessionId: session.sessionId, itemId: entry.itemId, response: { kind: "text", text: "Because the class default object is built before any world exists." } });

			if (entry === explain) expect(result).toMatchObject({ selfChecked: true, correct: false, quality: 0 });
			else expect(result.selfChecked).toBeUndefined();
		}

		const outcome = await fake.finishDrill(session.sessionId);

		expect((await fake.getProgress()).schedule[explain.itemId]).toBe(dueBefore);
		expect(outcome.selfCheckedCount).toBe(1);
		expect(outcome.totalCount).toBe(session.items.length - 1);
	});
});

describe("the fake pays nothing for a drill with no graded answer (A943)", () =>
{
	it("gives an all-self-checked drill no XP and an all-self-checked test-out no test-out, like the progress service", () =>
	{
		const allSelfChecked = { answeredAll: true, gradedCount: 0, correctCount: 0 };

		expect(drillReward("due", allSelfChecked)).toEqual({ pays: false, testsOut: false });
		expect(drillReward("test-out", allSelfChecked)).toEqual({ pays: false, testsOut: false });
	});

	it("still pays and tests out with graded answers, and the Parsons fallback never pays", () =>
	{
		expect(drillReward("test-out", { answeredAll: true, gradedCount: 6, correctCount: 6 })).toEqual({ pays: true, testsOut: true });
		expect(drillReward("test-out", { answeredAll: true, gradedCount: 6, correctCount: 5 })).toEqual({ pays: true, testsOut: false });
		expect(drillReward("parsons-fallback", { answeredAll: true, gradedCount: 1, correctCount: 1 }).pays).toBe(false);
		expect(drillReward("due", { answeredAll: false, gradedCount: 3, correctCount: 3 }).pays).toBe(false);
	});
});
