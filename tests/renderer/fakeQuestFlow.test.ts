// The fake's quest flows behave like the services they stand in for: real World 1 quests, grading by the A314 and A315 rules,
// runs that fail then pass, hints, breakdown submit and revise, drills, and the review timeout that offers Retry review.
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { BuildProgressEvent } from "@shared/types/run";

import { ContentLoader } from "../../src/main/services/content";
import { FakeDojoApi } from "../../src/renderer/src/data/fake/FakeDojoApi";
import { judgeBuild, testNamesIn } from "../../src/renderer/src/data/fake/FakeBuildJudge";
import { gradeParsons, gradeQuestion } from "../../src/renderer/src/data/fake/FakeItemGrader";
import { matchRequiredPieces } from "../../src/renderer/src/data/fake/FakeReviews";
import { withRetriedReview } from "../../src/renderer/src/screens/quests/loot/withRetriedReview";
import { buildFakeWorldFixture } from "../../tools/fake/buildFakeWorldFixture";

/** The training dummy's files with both gaps filled. */
async function solvedDummyFiles(fake: FakeDojoApi): Promise<Record<string, string>>
{
	const quest = await fake.getQuest("f1-training-dummy");

	if (quest.kind !== "build") throw new Error("the dummy is a build quest");

	const header = quest.files[0]?.starter.replace("\tvoid Strike();", "\tUFUNCTION(BlueprintCallable, Category = \"Dummy\")\n\tvoid Strike();") ?? "";
	const source = quest.files[1]?.starter.replace(/\t\/\/ Your code: do nothing.*$/m, "\tif (IsKnockedDown()) return;\n\tHitsTaken++;\n\tRefreshLabel();") ?? "";

	return { [quest.files[0]?.name ?? ""]: header, [quest.files[1]?.name ?? ""]: source };
}

describe("fake World 1 fixture", () =>
{
	it("serves the real World 1 from content/, built when the tests are built, so there is no copy to drift (A365)", async () =>
	{
		const content = await new ContentLoader(resolve("content")).load();
		const expected = buildFakeWorldFixture(content);
		const served = await new FakeDojoApi("quests").getWorld(expected.world.id);

		expect(served.quests.map((quest) => quest.id)).toEqual(expected.world.quests.map((quest) => quest.id));
	});

	it("keeps hint texts out of the quests (A222)", async () =>
	{
		const quest = await new FakeDojoApi("quests").getQuest("f1-training-dummy");

		expect(quest).not.toHaveProperty("hints");
		expect(quest.kind === "build" && quest.hintCount).toBe(3);
	});
});

describe("fake grading", () =>
{
	it("accepts a multiple-choice answer as the authored index or the text, and Parsons only in order without distractors (A314, A315)", () =>
	{
		const question = { id: "q", type: "multiple-choice" as const, prompt: "", choices: ["a", "b"], answerIndex: 1, explanation: "" };
		const block = { id: "b", prompt: "", lines: ["x", "y"], distractors: [{ line: "z", mistake: "m" }] };

		expect(gradeQuestion(question, { kind: "choice", choice: "1" }).correct).toBe(true);
		expect(gradeQuestion(question, { kind: "choice", choice: "b" }).correct).toBe(true);
		expect(gradeQuestion(question, { kind: "choice", choice: "0" }).correct).toBe(false);
		expect(gradeParsons(block, { kind: "order", lineIds: ["line-0", "line-1"] }).correct).toBe(true);
		expect(gradeParsons(block, { kind: "order", lineIds: ["distractor-0", "line-0", "line-1"] }).correct).toBe(false);
	});

	it("fails the training dummy's starter and passes it once both gaps are filled", async () =>
	{
		const fake = new FakeDojoApi("quests");
		const quest = await fake.getQuest("f1-training-dummy");

		if (quest.kind !== "build") throw new Error("build quest expected");

		const starters = Object.fromEntries(quest.files.map((file) => [file.name, file.starter]));

		expect(testNamesIn(quest.tests)).toHaveLength(2);
		expect(judgeBuild(quest, starters).tests.every((test) => !test.passed)).toBe(true);
		expect(judgeBuild(quest, await solvedDummyFiles(fake)).tests.every((test) => test.passed)).toBe(true);
		expect(judgeBuild(quest, { ...starters, "DojoF1TrainingDummy.cpp": "{" }).compiled).toBe(false);
	});
});

describe("fake quest flows", () =>
{
	it("runs with progress events, reveals hints in order, and records a passing submit with loot", async () =>
	{
		const fake = new FakeDojoApi("quests");
		const events: BuildProgressEvent[] = [];
		fake.onBuildProgress((event) => events.push(event));

		const failed = await fake.runQuest({ runId: "r1", questId: "f1-training-dummy", files: {} });
		const hint = await fake.revealHint("f1-training-dummy");
		const files = await solvedDummyFiles(fake);
		const submitted = await fake.submitQuest({ runId: "r2", questId: "f1-training-dummy", files });

		expect(failed.ok).toBe(false);
		expect(events.some((event) => event.runId === "r1" && event.phase === "testing")).toBe(true);
		expect(events.some((event) => event.runId === "r2" && event.phase === "reviewing")).toBe(true);
		expect(hint).toMatchObject({ hintIndex: 0, hintsRevealed: 1, xpCost: 6 });
		expect(submitted.run.ok).toBe(true);
		expect(submitted.outcome.attempt.passed).toBe(true);
		expect(submitted.outcome.xp.hintCost).toBe(-6);
		expect((await fake.getQuestAvailability())["f1-training-dummy"]?.status).toBe("passed");
	}, 20_000);

	it("times out the first review when Claude Code is chosen, offering Retry review, then reviews normally (A300)", async () =>
	{
		const fake = new FakeDojoApi("quests");
		await fake.updateSettings({ reviewProvider: "claude-code" });
		const files = await solvedDummyFiles(fake);

		const first = await fake.submitQuest({ runId: "a", questId: "f1-training-dummy", files });
		const retried = await fake.submitQuest({ runId: "b", questId: "f1-training-dummy", files });

		expect(first.review).toMatchObject({ provider: "tests-only", retryReviewSuggested: true });
		expect(retried.review?.provider).toBe("claude-code");
	}, 20_000);

	it("grades a concept quest and a breakdown revision through the contract", async () =>
	{
		const fake = new FakeDojoApi("quests");
		const concept = await fake.getQuest("f1-uobject-and-actor");

		if (concept.kind !== "concept") throw new Error("concept expected");

		const outcome = await fake.submitConcept({ questId: concept.id, prediction: null, answers: concept.questions.map(() => ({ kind: "text", text: "" })) });
		expect(outcome.results).toHaveLength(concept.questions.length);
		expect(outcome.outcome.attempt.passed).toBe(false);

		const plan = { pieces: [{ id: "p", kind: "component" as const, label: "CooldownComponent", purpose: "A reusable cooldown that can start and answer whether it is ready" }], edges: [] };
		await expect(fake.reviseBreakdown({ questId: "f1-dash-with-cooldown", revisedPlan: plan, revisionNote: "note" })).rejects.toMatchObject({ code: "invalid-payload" });

		const choice = await fake.submitBreakdown({ questId: "f1-dash-with-cooldown", plan });
		const graded = await fake.reviseBreakdown({ questId: "f1-dash-with-cooldown", revisedPlan: plan, revisionNote: "I split the cooldown out so a shield can reuse it." });

		expect(choice.referencePlanIndex).toBeGreaterThanOrEqual(0);
		expect(graded.grade.requiredPiecesCovered.some((piece) => piece.covered)).toBe(true);
		expect(graded.grade.requiredPiecesCovered.some((piece) => !piece.covered)).toBe(true);
	});

	it("runs a drill with every item type and pays only when every item is answered", async () =>
	{
		const fake = new FakeDojoApi("quests");
		const session = await fake.startDrill({ kind: "due" });
		const kinds = session.items.map((entry) => (entry.item.source === "parsons" ? "parsons" : entry.item.question.type));

		expect(new Set(kinds)).toEqual(new Set(["multiple-choice", "which-pattern", "fill-blank", "parsons", "spot-the-bug", "explain-in-one-sentence"]));

		for (const entry of session.items) await fake.answerDrillItem({ sessionId: session.sessionId, itemId: entry.itemId, response: { kind: "text", text: "x" } });

		const finished = await fake.finishDrill(session.sessionId);
		const fallback = await fake.startDrill({ kind: "parsons-fallback", questId: "f1-training-dummy" });

		expect(finished.xpGained).toBe(10);
		expect(finished.totalCount).toBe(session.items.length);
		expect(fallback.items).toHaveLength(1);
	});
});

describe("Retry review on the loot screen (A740, A741)", () =>
{
	it("reviews the recorded attempt again without a new attempt; the loot, score, pass, and attempt id stay, and only the review changes", async () =>
	{
		const fake = new FakeDojoApi("quests");
		await fake.updateSettings({ reviewProvider: "claude-code" });
		const files = await solvedDummyFiles(fake);
		const quest = await fake.getQuest("f1-training-dummy");
		const first = await fake.submitQuest({ runId: "a", questId: quest.id, files });
		const attemptsBefore = (await fake.getProgress()).attempts.length;

		expect(first.review?.retryReviewSuggested).toBe(true);

		const review = await fake.retryReview(first.outcome.attempt.attemptId);
		const entry = withRetriedReview({ quest, outcome: first.outcome, detail: { kind: "build", run: first.run, files, ...(first.review ? { review: first.review } : {}) } }, review);
		const progress = await fake.getProgress();

		expect(review.provider).toBe("claude-code");
		expect(progress.attempts).toHaveLength(attemptsBefore);
		expect(progress.attempts.at(-1)?.review?.provider).toBe("claude-code");
		expect(entry.outcome.xp.total).toBe(first.outcome.xp.total);
		expect(entry.outcome.attempt).toMatchObject({ attemptId: first.outcome.attempt.attemptId, score: first.outcome.attempt.score, passed: first.outcome.attempt.passed });
		expect(entry.detail.kind === "build" && entry.detail.review?.provider).toBe("claude-code");
		await expect(fake.retryReview("attempt-missing")).rejects.toMatchObject({ code: "attempt-not-found" });
	}, 20_000);
});

describe("the quests scenario and the fake breakdown grader", () =>
{
	it("starts World 1 unplayed: nothing passed, no attempts, rematches, or World 1 card use cases (A351)", async () =>
	{
		const fake = new FakeDojoApi("quests");
		const progress = await fake.getProgress();
		const availability = await fake.getQuestAvailability();
		const worldOneIds = Object.keys(availability).filter((questId) => questId.startsWith("f1-"));

		expect(worldOneIds).toHaveLength(12);
		expect(worldOneIds.filter((questId) => availability[questId]?.status === "passed")).toEqual([]);
		expect(availability["f1-boss-training-yard"]?.status).toBe("locked");
		expect(progress.attempts.some((attempt) => attempt.questId.startsWith("f1-"))).toBe(false);
		expect(Object.keys(progress.rematches).some((questId) => questId.startsWith("f1-"))).toBe(false);
		expect(Object.values(progress.patternCards).flatMap((card) => card.useCasesPassed).some((questId) => questId.startsWith("f1-"))).toBe(false);
		expect((await fake.getTestOutStatus())["foundations/objects-and-reflection"]?.reason).not.toContain("passed already");
		expect((await new FakeDojoApi("returning").getTestOutStatus())["foundations/objects-and-reflection"]?.reason).toContain("passed already");
	});

	it("credits each learner piece to at most one required piece", async () =>
	{
		const quest = await new FakeDojoApi("quests").getQuest("f1-dash-with-cooldown");

		if (quest.kind !== "breakdown") throw new Error("breakdown expected");

		const oneBigPiece = { pieces: [{ id: "p", kind: "component" as const, label: "Dash component", purpose: "Dash input, cooldown ready events, wall stop, movement lock, HUD wedge, editable distance values" }], edges: [] };
		const matches = matchRequiredPieces(quest.requiredPieces, oneBigPiece);

		expect(matches.filter((match) => match !== undefined)).toHaveLength(1);
	});
});

describe("revealed hints persist (A500 to A502)", () =>
{
	it("answers an already revealed index again for free, refuses a skipped one, and returns paid texts with the quest", async () =>
	{
		const fake = new FakeDojoApi("quests");
		const first = await fake.revealHint("f1-training-dummy", 0);
		const again = await fake.revealHint("f1-training-dummy", 0);
		const quest = await fake.getQuest("f1-training-dummy");
		const progress = await fake.getProgress();

		expect(first.alreadyRevealed).toBe(false);
		expect(again).toMatchObject({ hintIndex: 0, alreadyRevealed: true, hintsRevealed: 1, text: first.text });
		await expect(fake.revealHint("f1-training-dummy", 2)).rejects.toMatchObject({ code: "invalid-payload" });
		expect(quest.kind === "build" && quest.revealedHints).toEqual([first.text]);
		expect(progress.quests["f1-training-dummy"]?.revealedHints).toEqual([0]);
	});
});
