// M3.4b: the fake answers the three review extras like the review service, including the Tests-only fallbacks that are answered but never kept (A850 to A855, A950).
import { describe, expect, it } from "vitest";

import { FakeDojoApi } from "../../src/renderer/src/data/fake/FakeDojoApi";

/** The score keeper's starter files with every file changed, which the fake engine passes. */
async function passingScoreKeeperFiles(fake: FakeDojoApi): Promise<Record<string, string>>
{
	const quest = await fake.getQuest("f1-score-keeper");

	if (quest.kind !== "build") throw new Error("the score keeper is a build quest");

	return Object.fromEntries(quest.files.map((file) => [file.name, `${file.starter}\n// changed`]));
}

describe("the fake's review extras", () =>
{
	it("opens the alternative only after a pass, with the AI reviewer's hint", async () =>
	{
		const fake = new FakeDojoApi("quests");

		await expect(fake.getQuestAlternative("f1-score-keeper")).rejects.toMatchObject({ code: "alternative-locked" });
		expect(await fake.getQuestAlternative("f1-uobject-and-actor")).toBeNull();

		const submitted = await fake.submitQuest({ runId: "r", questId: "f1-score-keeper", files: await passingScoreKeeperFiles(fake) });
		const alternative = await fake.getQuestAlternative("f1-score-keeper");

		expect(submitted.outcome.attempt.passed).toBe(true);
		expect(alternative?.markdown.length).toBeGreaterThan(0);
		expect(alternative?.reviewHint).toBeTruthy();
	}, 20_000);

	it("with Tests only: the review, Why? and the reflection fall back like the real bridge, nothing is kept, and the alternative has no hint", async () =>
	{
		const fake = new FakeDojoApi("quests");
		await fake.updateSettings({ reviewProvider: "tests-only" });
		const submitted = await fake.submitQuest({ runId: "r", questId: "f1-score-keeper", files: await passingScoreKeeperFiles(fake) });
		const attemptId = submitted.outcome.attempt.attemptId;

		expect(submitted.review?.provider).toBe("tests-only");

		const why = await fake.explainFinding({ attemptId, findingIndex: 0 });
		const reflection = await fake.answerReflection({ attemptId, answer: "Designers tune the score from the editor because the list is reflected." });
		const attempt = (await fake.getProgress()).attempts.find((candidate) => candidate.attemptId === attemptId);

		// As the real ProviderSelector answers Tests only: no fallbackReason, and the tests-only provider's own words (A953).
		expect(submitted.review?.fallbackReason).toBeUndefined();
		expect(why).toContain("An AI reviewer can check this");
		expect(reflection).toEqual({ score: 70, verdict: "partly", note: "Self-check: reread your sentence against the question and your code.", provider: "tests-only" });
		expect(attempt?.explanations ?? {}).toEqual({});
		expect(attempt?.reflection).toBeUndefined();
		expect((await fake.getQuestAlternative("f1-score-keeper"))?.reviewHint).toBeUndefined();
	}, 20_000);

	it("with Claude Code: the first reflection times out into a self-check that offers Ask again, and asking again gets an AI grade that is kept (A954)", async () =>
	{
		const fake = new FakeDojoApi("quests");
		await fake.updateSettings({ reviewProvider: "claude-code" });
		const submitted = await fake.submitQuest({ runId: "r", questId: "f1-score-keeper", files: await passingScoreKeeperFiles(fake) });
		const request = { attemptId: submitted.outcome.attempt.attemptId, answer: "Casting each entry keeps the keeper from trusting whatever a designer put in the list." };

		const timedOut = await fake.answerReflection(request);
		const askedAgain = await fake.answerReflection(request);
		const attempt = (await fake.getProgress()).attempts.find((candidate) => candidate.attemptId === request.attemptId);

		expect(timedOut).toMatchObject({ provider: "tests-only", retryReviewSuggested: true, fallbackReason: expect.stringContaining("Press Ask again") });
		expect(askedAgain.provider).toBe("claude-code");
		expect(attempt?.reflection?.grade.provider).toBe("claude-code");
	}, 20_000);
});
