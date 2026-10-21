// The fake's quest flows behave like the services they stand in for: real World 1 quests, grading by the A314 and A315 rules,
// runs that fail then pass, hints, breakdown submit and revise, drills, and the review timeout that offers Retry review.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { BuildProgressEvent } from "@shared/types/run";

import { ContentLoader } from "../../src/main/services/content";
import { FakeDojoApi } from "../../src/renderer/src/data/fake/FakeDojoApi";
import { judgeBuild, testNamesIn } from "../../src/renderer/src/data/fake/FakeBuildJudge";
import { gradeParsons, gradeQuestion } from "../../src/renderer/src/data/fake/FakeItemGrader";
import { mergeRetriedReview } from "../../src/renderer/src/screens/quests/loot/mergeRetriedReview";
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
	it("matches the real content, so the fake never drifts from Pack 1 World 1 (regenerate with tools/write-fake-world-fixture.ts)", async () =>
	{
		const content = await new ContentLoader(resolve("content")).load();
		const committed = JSON.parse(await readFile(resolve("src/renderer/src/data/fake/fixtures/worldOneFixture.json"), "utf8")) as unknown;

		expect(committed).toEqual(JSON.parse(JSON.stringify(buildFakeWorldFixture(content))));
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

describe("Retry review on the loot screen (A356)", () =>
{
	it("keeps a paid pass's loot and takes the new review; a failed first attempt shows the retry's own loot", async () =>
	{
		const fake = new FakeDojoApi("quests");
		await fake.updateSettings({ reviewProvider: "claude-code" });
		const files = await solvedDummyFiles(fake);
		const quest = await fake.getQuest("f1-training-dummy");
		const first = await fake.submitQuest({ runId: "a", questId: quest.id, files });
		const retried = await fake.submitQuest({ runId: "b", questId: quest.id, files });
		const previous = { quest, outcome: first.outcome, detail: { kind: "build" as const, run: first.run, files } };

		const merged = mergeRetriedReview(previous, retried, files);

		expect(first.outcome.xp.total).toBeGreaterThan(0);
		expect(retried.outcome.xp.total).toBe(0);
		expect(merged.outcome.xp.total).toBe(first.outcome.xp.total);
		expect(merged.outcome.attempt.attemptId).toBe(retried.outcome.attempt.attemptId);
		expect(merged.detail.kind === "build" && merged.detail.review?.provider).toBe("claude-code");

		const failedFirst = { ...previous, outcome: { ...first.outcome, attempt: { ...first.outcome.attempt, passed: false } } };
		expect(mergeRetriedReview(failedFirst, retried, files).outcome).toBe(retried.outcome);
	}, 20_000);
});
