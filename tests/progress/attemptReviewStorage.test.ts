// M1.7c: a Submit attempt keeps its code review and capped files, older files are pruned per quest, and both survive a save and reload.
import { describe, expect, it } from "vitest";

import type { AttemptRecord } from "@shared/types/progress";
import type { CodeReview } from "@shared/types/review";

import { AttemptFileRules, CUT_OFF_NOTE, MAXIMUM_STORED_ATTEMPT_LENGTH, MAXIMUM_STORED_FILE_LENGTH, STORED_DETAIL_ATTEMPTS_PER_QUEST } from "../../src/main/services/progress/AttemptFileRules";
import { ProgressService } from "../../src/main/services/progress/ProgressService";
import { FixedClock } from "../support/FixedClock";
import { createTestProgressService, localMoment, makeQuest } from "../support/progressFixtures";
import { SequenceRandom } from "../support/SequenceRandom";

const buildQuest = makeQuest({ id: "q1", title: "Health", kind: "build" });
const otherQuest = makeQuest({ id: "q2", title: "Door", kind: "build", order: 2 });
const quests = [buildQuest, otherQuest];

/** A small code review. */
const REVIEW: CodeReview = {
	score: 80,
	summary: "Clean split.",
	rubric: [{ line: "Health lives in a component", met: true, note: "Yes." }],
	findings: [{ severity: "problem", title: "No broadcast", detail: "Never broadcasts.", file: "Health.cpp", line: 3 }],
	reflectionQuestion: "Why a delegate?",
	alternativeHint: "Attribute sets.",
	provider: "claude-code",
};

describe("ProgressService stores the Submit's review and files", () =>
{
	it("keeps the review and files on a Submit attempt and in the saved file after a reload", async () =>
	{
		const { service, store } = createTestProgressService();

		const outcome = await service.recordAttempt({ quest: buildQuest, score: 80, passed: true, compiled: true, isSubmit: true, review: REVIEW, files: { "Health.cpp": "// code" } }, quests);

		expect(outcome.attempt.review).toEqual(REVIEW);
		expect(outcome.attempt.files).toEqual({ "Health.cpp": "// code" });

		const reloaded = await ProgressService.open(store, new FixedClock(localMoment(2026, 10, 21)), new SequenceRandom([0]));
		const saved = reloaded.getProgress().attempts[0];

		expect(saved?.review).toEqual(REVIEW);
		expect(saved?.files).toEqual({ "Health.cpp": "// code" });
	});

	it("stores no files when the attempt is not a Submit, and nothing extra when none are given", async () =>
	{
		const { service } = createTestProgressService();

		const notSubmit = await service.recordAttempt({ quest: buildQuest, score: 80, passed: true, compiled: true, isSubmit: false, files: { "A.h": "x" } }, quests);
		const plain = await service.recordAttempt({ quest: buildQuest, score: 80, passed: true, compiled: true, isSubmit: true }, quests);

		expect(notSubmit.attempt.files).toBeUndefined();
		expect(plain.attempt).not.toHaveProperty("review");
		expect(plain.attempt).not.toHaveProperty("files");
	});

	it("keeps files only on each quest's last five Submits", async () =>
	{
		const { service } = createTestProgressService();

		for (let index = 1; index <= 7; index++) await service.recordAttempt({ quest: buildQuest, score: 50, passed: false, compiled: true, isSubmit: true, files: { "A.h": `version ${index}` } }, quests);
		await service.recordAttempt({ quest: otherQuest, score: 50, passed: false, compiled: true, isSubmit: true, files: { "B.h": "other" } }, quests);

		const attempts = service.getProgress().attempts;
		const withFiles = attempts.filter((attempt) => attempt.questId === "q1" && attempt.files).map((attempt) => attempt.files?.["A.h"]);

		expect(attempts).toHaveLength(8);
		expect(withFiles).toEqual(["version 3", "version 4", "version 5", "version 6", "version 7"]);
		expect(attempts[7]?.files).toEqual({ "B.h": "other" });
	});
});

describe("AttemptFileRules", () =>
{
	const rules = new AttemptFileRules();

	it("cuts a file at 64 KB with a note", () =>
	{
		const capped = rules.capFiles({ "Big.cpp": "x".repeat(MAXIMUM_STORED_FILE_LENGTH + 10), "Small.h": "y" });

		expect(capped["Big.cpp"]).toBe("x".repeat(MAXIMUM_STORED_FILE_LENGTH) + CUT_OFF_NOTE);
		expect(capped["Small.h"]).toBe("y");
	});

	it("keeps files by name until the attempt reaches 256 KB and leaves the rest out", () =>
	{
		const nearlyFull = "z".repeat(60 * 1024);
		const files: Record<string, string> = { "A.cpp": nearlyFull, "B.cpp": nearlyFull, "C.cpp": nearlyFull, "D.cpp": nearlyFull, "E.cpp": nearlyFull, "F.h": "tiny" };

		const capped = rules.capFiles(files);
		const total = Object.values(capped).reduce((sum, content) => sum + content.length, 0);

		expect(Object.keys(capped)).toEqual(["A.cpp", "B.cpp", "C.cpp", "D.cpp", "F.h"]);
		expect(total).toBeLessThanOrEqual(MAXIMUM_STORED_ATTEMPT_LENGTH);
	});

	it("prunes only the given quest and keeps attempts without files as they are", () =>
	{
		const attempts: AttemptRecord[] = Array.from({ length: STORED_DETAIL_ATTEMPTS_PER_QUEST + 1 }, (_, index) => ({ attemptId: `a${index}`, questId: "q1", at: "2026-10-21T10:00:00.000Z", score: 0, passed: false, xpGained: 0, files: { "A.h": String(index) } }));
		attempts.push({ attemptId: "other", questId: "q2", at: "2026-10-21T10:00:00.000Z", score: 0, passed: false, xpGained: 0, files: { "B.h": "b" } });

		const pruned = rules.pruneOlderDetails(attempts, "q1");

		expect(pruned[0]).not.toHaveProperty("files");
		expect(pruned.slice(1, STORED_DETAIL_ATTEMPTS_PER_QUEST + 1).every((attempt) => attempt.files !== undefined)).toBe(true);
		expect(pruned.at(-1)?.files).toEqual({ "B.h": "b" });
		expect(attempts[0]?.files).toBeDefined();
	});
});
