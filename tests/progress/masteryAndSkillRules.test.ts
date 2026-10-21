// Mastery up and down from the scheduler, and skill points and skill mastery.
import { describe, expect, it } from "vitest";

import { MasteryRules } from "../../src/main/services/progress/MasteryRules";
import { SkillRules } from "../../src/main/services/progress/SkillRules";

const mastery = new MasteryRules();
const skills = new SkillRules();

describe("MasteryRules", () =>
{
	it("starts a seen item at attempted, even on a miss", () =>
	{
		expect(mastery.afterReview(null, false, 0, 1)).toBe("attempted");
	});

	it("reaches familiar after one successful recall", () =>
	{
		expect(mastery.afterReview("attempted", true, 1, 1)).toBe("familiar");
	});

	it("reaches proficient after three successful spaced recalls", () =>
	{
		expect(mastery.afterReview("familiar", true, 2, 3)).toBe("familiar");
		expect(mastery.afterReview("familiar", true, 3, 8)).toBe("proficient");
	});

	it("reaches mastered at an interval of 30 days or more", () =>
	{
		expect(mastery.afterReview("proficient", true, 5, 29)).toBe("proficient");
		expect(mastery.afterReview("proficient", true, 6, 30)).toBe("mastered");
	});

	it("drops one level on a miss, never below attempted", () =>
	{
		expect(mastery.afterReview("mastered", false, 0, 1)).toBe("proficient");
		expect(mastery.afterReview("familiar", false, 0, 1)).toBe("attempted");
		expect(mastery.afterReview("attempted", false, 0, 1)).toBe("attempted");
	});

	it("does not jump straight back after a drop: a success only keeps the dropped level until recalls rebuild", () =>
	{
		expect(mastery.afterReview("familiar", true, 1, 1)).toBe("familiar");
	});
});

describe("SkillRules", () =>
{
	it("gives each listed skill the quest difficulty in points on a pass", () =>
	{
		const { skills: next, changes } = skills.applyPass({}, ["ue.objects", "ue.memory"], 3, false);

		expect(next["ue.objects"]).toEqual({ points: 3, mastery: "attempted" });
		expect(changes).toHaveLength(2);
	});

	it("doubles points for a boss", () =>
	{
		expect(skills.pointsFor(3, true)).toBe(6);
	});

	it("follows the skill's weakest item, so one missed item shows the skill as due for review", () =>
	{
		expect(skills.masteryFromItems(["mastered", "familiar", "proficient"])).toBe("familiar");
		expect(skills.masteryFromItems([])).toBe("attempted");
	});
});
