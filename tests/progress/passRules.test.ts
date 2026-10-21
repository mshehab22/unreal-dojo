// One test per pass rule in docs/systems/progress-and-rules.md "Rules".
import { describe, expect, it } from "vitest";

import { PassRules } from "../../src/main/services/progress/PassRules";

const rules = new PassRules();

describe("PassRules", () =>
{
	it("scores build and refactor as 0.6 tests + 0.4 review", () =>
	{
		expect(rules.codeScore({ compiled: true, testsPassed: 4, testsTotal: 4, reviewScore: 50 })).toBe(80);
	});

	it("uses the test score as the review score when tests-only", () =>
	{
		expect(rules.codeScore({ compiled: true, testsPassed: 3, testsTotal: 4, reviewScore: null })).toBe(75);
	});

	it("needs compiled, every test passing, and score >= 70 to pass a build", () =>
	{
		expect(rules.isCodePass({ compiled: true, testsPassed: 4, testsTotal: 4, reviewScore: 25 })).toBe(true);
		expect(rules.isCodePass({ compiled: true, testsPassed: 4, testsTotal: 4, reviewScore: 22 })).toBe(false);
		expect(rules.isCodePass({ compiled: true, testsPassed: 3, testsTotal: 4, reviewScore: 100 })).toBe(false);
		expect(rules.isCodePass({ compiled: false, testsPassed: 0, testsTotal: 4, reviewScore: null })).toBe(false);
	});

	it("passes a breakdown at >= 70 only with every required piece present", () =>
	{
		expect(rules.isBreakdownPass(70, true)).toBe(true);
		expect(rules.isBreakdownPass(69, true)).toBe(false);
		expect(rules.isBreakdownPass(95, false)).toBe(false);
	});

	it("passes a concept quest at 80% of questions", () =>
	{
		expect(rules.isConceptPass(4, 5)).toBe(true);
		expect(rules.isConceptPass(3, 5)).toBe(false);
		expect(rules.isConceptPass(0, 0)).toBe(false);
		expect(rules.conceptScore(4, 5)).toBe(80);
	});

	it("passes a boss integration at an integration rubric score >= 70", () =>
	{
		expect(rules.isBossIntegrationPass(70)).toBe(true);
		expect(rules.isBossIntegrationPass(69)).toBe(false);
	});
});
