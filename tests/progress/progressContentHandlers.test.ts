// Every progress and drill method wired in M1.6b, through the real handler table, on the fixture content loaded by the real ContentCatalog.
import { describe, expect, it } from "vitest";

import type { DrillItem } from "@shared/types/content";
import type { ItemResponse } from "@shared/types/progress";

import { createHandlers, type HandlerDependencies } from "../../src/main/ipc/createHandlers";
import type { HandlerTable } from "../../src/main/ipc/HandlerDefinition";
import { DrillItemBank, parsonsItemId } from "../../src/main/services/progress/DrillItemBank";
import { toRuleQuests } from "../../src/main/services/progress/toRuleQuests";
import { toLearnerWorld, toPackOutlines } from "../../src/main/content/contentViews";
import { buildQuest, conceptQuest, createTestProgressContent, fakeGraders, fixtureContent, observerCard } from "../support/contentFixture";

/** The handler table on a fresh fixture stack. */
function setup(options: Parameters<typeof createTestProgressContent>[0] = {})
{
	const stack = createTestProgressContent(options);
	const dependencies: HandlerDependencies = {
		getAppVersion: () => "1.0.0",
		getEngineLocator: () => { throw new Error("not used"); },
		getContentCatalog: () => stack.catalog,
		pickFolder: async () => null,
		progressService: stack.service,
		progressContentService: stack.content,
	};

	return { ...stack, handlers: createHandlers(dependencies) };
}

/** Right answers to the fixture concept quest, in question order. */
const RIGHT_CONCEPT_ANSWERS: ItemResponse[] = [
	{ kind: "choice", choice: "1" },
	{ kind: "text", text: "  uproperty " },
	{ kind: "choice", choice: "observer" },
	{ kind: "choice", choice: "2" },
	{ kind: "text", text: "It does a." },
];

/** Passes the fixture concept quest through the handler. */
async function passConcept(handlers: HandlerTable)
{
	return handlers.submitConcept.handle({ questId: "w1-concept", prediction: null, answers: RIGHT_CONCEPT_ANSWERS });
}

/** A right answer for any drill item of the fixture. */
function rightAnswerFor(item: DrillItem): ItemResponse
{
	if (item.source === "parsons") return { kind: "order", lineIds: item.parsons.lines.map((_, index) => `line-${index}`) };

	const question = item.question;
	switch (question.type)
	{
		case "multiple-choice": return { kind: "choice", choice: String(question.answerIndex) };
		case "fill-blank": return { kind: "text", text: question.acceptedAnswers[0] ?? "" };
		case "which-pattern": return { kind: "choice", choice: question.answer };
		case "spot-the-bug": return { kind: "choice", choice: String(question.bugLine) };
		case "explain-in-one-sentence": return { kind: "text", text: question.modelAnswer };
	}
}

describe("content-to-rules mapper", () =>
{
	it("maps every quest's kind, difficulty, xp, place, prerequisites, terms, patterns, skills, and scaffold, with addsNewClass true (A132)", () =>
	{
		const quests = toRuleQuests(toPackOutlines(fixtureContent().packs));
		const build = quests.find((quest) => quest.id === "w1-build");

		expect(quests.map((quest) => quest.id)).toEqual(["w1-concept", "w1-build", "w1-breakdown", "w1-boss", "w2-concept"]);
		expect(build).toEqual({
			id: "w1-build", title: "w1-build", kind: "build", difficulty: 1, xp: 100, packId: "pack-1", packOrder: 1, worldId: "world-1", worldOrder: 1, order: 2,
			scaffold: "worked", prerequisites: ["w1-concept"], terms: ["term.a"], patterns: ["observer"], skills: ["ue.objects"], addsNewClass: true,
		});
		expect(quests.find((quest) => quest.id === "w1-concept")?.scaffold).toBeUndefined();
	});
});

describe("drill item bank", () =>
{
	const content = fixtureContent();
	const bank = new DrillItemBank(content.packs.flatMap((pack) => pack.worlds.map((world) => toLearnerWorld(world))), [observerCard]);

	it("asks about each term of a concept quest through its questions, and about the answer pattern of a which-pattern question", () =>
	{
		expect(bank.variantsOf("term.a").map((variant) => variant.format)).toEqual(["recall", "recall", "recall", "explain"]);
		expect(bank.variantsOf("observer").map((variant) => variant.item.source)).toEqual(["quest-question", "pattern-recall", "pattern-scenario"]);
	});

	it("makes each Parsons block its own item, and keeps skill and world for rematches", () =>
	{
		const [parsons] = bank.variantsOf(parsonsItemId("w1-build", "order-1"));

		expect(parsons).toMatchObject({ format: "parsons", worldId: "world-1", skillId: "ue.objects", topic: "world-1" });
	});
});

describe("getQuestAvailability and getTestOutStatus", () =>
{
	it("opens the first quest, locks the rest until the concept quest passes, then opens them", async () =>
	{
		const { handlers } = setup();
		const before = await handlers.getQuestAvailability.handle();

		expect(before["w1-concept"]?.status).toBe("available");
		expect(before["w1-build"]).toMatchObject({ status: "locked", lockedReason: "Pass w1-concept first." });

		await passConcept(handlers);
		const after = await handlers.getQuestAvailability.handle();

		expect(after["w1-concept"]?.status).toBe("passed");
		expect(after["w1-build"]?.status).toBe("available");
		expect(after["w2-concept"]?.status).toBe("available");
	});

	it("reports each world's test-out: not eligible with a reason, then eligible once every term is proficient", async () =>
	{
		const proficient = { ease: 2.5, intervalDays: 8, repetitions: 3, mastery: "proficient" as const, lastReviewedAt: "2026-10-20T09:00:00.000Z" };
		const { handlers } = setup({ prepare: (progress) => { progress.memory["term.a"] = proficient; } });

		expect((await handlers.getTestOutStatus.handle())["world-1"]).toEqual({ eligible: false, testedOut: false, reason: "1 term is not proficient yet." });

		const ready = setup({ prepare: (progress) => { progress.memory["term.a"] = proficient; progress.memory["term.b"] = proficient; } });
		expect((await ready.handlers.getTestOutStatus.handle())["world-1"]).toEqual({ eligible: true, testedOut: false });
	});
});

describe("revealHint", () =>
{
	it("reveals a build quest's hints in order once it is open, and refuses a locked quest or a kind without hints", async () =>
	{
		const { handlers } = setup();

		await expect(handlers.revealHint.handle("w1-build")).rejects.toMatchObject({ appError: { code: "quest-locked" } });

		await passConcept(handlers);
		expect(await handlers.revealHint.handle("w1-build")).toEqual({ hintIndex: 0, text: "First hint.", xpCost: 15, hintsRevealed: 1 });
		expect((await handlers.revealHint.handle("w1-build")).text).toBe("Second hint.");
		await expect(handlers.revealHint.handle("w1-concept")).rejects.toMatchObject({ appError: { code: "invalid-payload" } });
		await expect(handlers.revealHint.handle("missing")).rejects.toMatchObject({ appError: { code: "quest-not-found" } });
	});
});

describe("submitConcept", () =>
{
	it("grades every question in main, passes at 80%, reviews the quest's terms, and returns the loot", async () =>
	{
		const { handlers, service } = setup();

		const { results, outcome } = await passConcept(handlers);

		expect(results.map((result) => result.correct)).toEqual([true, true, true, true, true]);
		expect(results[0]?.modelAnswer).toBe("right");
		expect(outcome.attempt).toMatchObject({ questId: "w1-concept", passed: true, score: 100 });
		expect(outcome.xp.total).toBe(100);
		expect(outcome.unlockedQuestIds).toEqual(["w1-build", "w1-breakdown", "w1-boss", "w2-concept"]);
		expect(service.getProgress().memory["term.a"]?.mastery).toBe("familiar");
		expect(service.getProgress().reviewLog.map((entry) => entry.itemId)).toEqual(["term.a", "term.b"]);
	});

	it("fails below 80% and still enters the terms into the scheduler", async () =>
	{
		const { handlers, service } = setup();
		const answers: ItemResponse[] = [{ kind: "choice", choice: "0" }, { kind: "text", text: "nope" }, { kind: "choice", choice: "observer" }, { kind: "choice", choice: "2" }, { kind: "text", text: "x" }];

		const { outcome } = await handlers.submitConcept.handle({ questId: "w1-concept", prediction: null, answers });

		expect(outcome.attempt.passed).toBe(false);
		expect(outcome.xp.total).toBe(0);
		expect(service.getProgress().memory["term.a"]?.mastery).toBe("attempted");
	});

	it("leaves a self-checked explain answer out of the pass count when no AI grader answered (A315)", async () =>
	{
		const { handlers } = setup({ graders: fakeGraders("tests-only", "incorrect") });

		const { outcome, results } = await passConcept(handlers);

		expect(outcome.attempt).toMatchObject({ passed: true, score: 100 });
		expect(results[4]?.explainGrade?.provider).toBe("tests-only");
	});

	it("refuses a wrong answer count and a quest that is not a concept quest", async () =>
	{
		const { handlers } = setup();

		await expect(handlers.submitConcept.handle({ questId: "w1-concept", prediction: null, answers: [] })).rejects.toMatchObject({ appError: { code: "invalid-payload" } });
		await passConcept(handlers);
		await expect(handlers.submitConcept.handle({ questId: "w1-build", prediction: null, answers: [] })).rejects.toMatchObject({ appError: { code: "invalid-payload" } });
	});
});

describe("submitBreakdown and reviseBreakdown", () =>
{
	const learnerPlan = { pieces: [{ id: "a", kind: "component" as const, label: "FireComponent", purpose: "Burns wood." }], edges: [] };

	it("keeps the first plan, shows the reference plan sharing the most labels, then grades the revision and records the pass", async () =>
	{
		const { handlers, service } = setup();
		await passConcept(handlers);

		expect(await handlers.submitBreakdown.handle({ questId: "w1-breakdown", plan: learnerPlan })).toEqual({ referencePlanIndex: 1 });
		expect(service.getProgress().quests["w1-breakdown"]?.submittedPlan).toEqual(learnerPlan);

		const { grade, outcome } = await handlers.reviseBreakdown.handle({ questId: "w1-breakdown", revisedPlan: learnerPlan, revisionNote: "Added the event." });

		expect(grade.score).toBe(90);
		expect(outcome.attempt).toMatchObject({ questId: "w1-breakdown", passed: true });
		expect(service.getProgress().quests["w1-breakdown"]).toMatchObject({ status: "passed", revisionNote: "Added the event." });
	});

	it("refuses a revision before the first submit or without a note", async () =>
	{
		const { handlers } = setup();
		await passConcept(handlers);

		await expect(handlers.reviseBreakdown.handle({ questId: "w1-breakdown", revisedPlan: learnerPlan, revisionNote: "Note." })).rejects.toMatchObject({ appError: { code: "invalid-payload" } });
		await handlers.submitBreakdown.handle({ questId: "w1-breakdown", plan: learnerPlan });
		await expect(handlers.reviseBreakdown.handle({ questId: "w1-breakdown", revisedPlan: learnerPlan, revisionNote: "   " })).rejects.toMatchObject({ appError: { code: "invalid-payload" } });
	});

	it("grades a boss breakdown but records no pass: the boss passes with its integration build (A317)", async () =>
	{
		const { handlers, service } = setup();
		await passConcept(handlers);
		await handlers.submitBreakdown.handle({ questId: "w1-boss", plan: learnerPlan });

		const { outcome } = await handlers.reviseBreakdown.handle({ questId: "w1-boss", revisedPlan: learnerPlan, revisionNote: "Better." });

		expect(outcome.xp.total).toBe(0);
		expect(service.getProgress().quests["w1-boss"]?.status).toBe("in_progress");
		expect(service.getProgress().attempts.map((attempt) => attempt.questId)).toEqual(["w1-concept"]);
	});
});

describe("getDailyQuest", () =>
{
	it("offers a drill and an open concept quest; no short builds while content cannot say a quest adds no class", async () =>
	{
		const { handlers } = setup();

		expect((await handlers.getDailyQuest.handle()).offered).toEqual([{ kind: "drill" }, { kind: "concept", questId: "w1-concept" }]);
	});
});

describe("drills", () =>
{
	it("refuses a due drill when the learner has met nothing yet", async () =>
	{
		const { handlers } = setup();

		await expect(handlers.startDrill.handle({ kind: "due" })).rejects.toMatchObject({ appError: { code: "quest-locked" } });
	});

	it("runs a due drill: composes it from met items, grades each answer, reschedules, and pays drill XP when finished", async () =>
	{
		const { handlers, clock, service } = setup();
		await passConcept(handlers);
		clock.advanceDays(1);

		const session = await handlers.startDrill.handle({ kind: "due" });
		const itemIds = session.items.map((item) => item.itemId);

		expect(new Set(itemIds).size).toBe(itemIds.length);
		expect(itemIds).toEqual(expect.arrayContaining(["term.a", "term.b"]));

		for (const sessionItem of session.items)
		{
			const result = await handlers.answerDrillItem.handle({ sessionId: session.sessionId, itemId: sessionItem.itemId, response: rightAnswerFor(sessionItem.item) });

			expect(result.correct).toBe(true);
			expect(result.modelAnswer).toBeDefined();
		}

		const outcome = await handlers.finishDrill.handle(session.sessionId);

		expect(outcome).toMatchObject({ xpGained: 10, correctCount: session.items.length, totalCount: session.items.length, testedOutWorldIds: [] });
		expect(service.getProgress().memory["term.a"]?.repetitions).toBe(2);
		await expect(handlers.finishDrill.handle(session.sessionId)).rejects.toMatchObject({ appError: { code: "invalid-payload" } });
	});

	it("refuses an item twice or an item from outside the session, and pays nothing for an unfinished drill", async () =>
	{
		const { handlers } = setup();
		await passConcept(handlers);
		const session = await handlers.startDrill.handle({ kind: "due" });
		const first = session.items[0];
		if (!first) throw new Error("expected an item");

		await handlers.answerDrillItem.handle({ sessionId: session.sessionId, itemId: first.itemId, response: rightAnswerFor(first.item) });
		await expect(handlers.answerDrillItem.handle({ sessionId: session.sessionId, itemId: first.itemId, response: rightAnswerFor(first.item) })).rejects.toMatchObject({ appError: { code: "invalid-payload" } });
		await expect(handlers.answerDrillItem.handle({ sessionId: session.sessionId, itemId: "not-in-session", response: { kind: "text", text: "" } })).rejects.toMatchObject({ appError: { code: "invalid-payload" } });

		expect((await handlers.finishDrill.handle(session.sessionId)).xpGained).toBe(0);
	});

	it("does not schedule an explain item that only a self-check graded (A318)", async () =>
	{
		const { handlers, service } = setup({ graders: fakeGraders("tests-only", "incorrect") });
		await passConcept(handlers);
		const session = await handlers.startDrill.handle({ kind: "due" });
		const explain = session.items.find((item) => item.item.source !== "parsons" && item.item.question.type === "explain-in-one-sentence");
		if (!explain) throw new Error("expected an explain item");

		const dueBefore = service.getProgress().schedule[explain.itemId];
		const reviewsBefore = service.getProgress().reviewLog.length;
		const result = await handlers.answerDrillItem.handle({ sessionId: session.sessionId, itemId: explain.itemId, response: { kind: "text", text: "Something." } });

		expect(result).toMatchObject({ quality: 0, explainGrade: { provider: "tests-only" }, nextDueAt: dueBefore });
		expect(service.getProgress().schedule[explain.itemId]).toBe(dueBefore);
		expect(service.getProgress().reviewLog).toHaveLength(reviewsBefore);
	});

	it("runs a world's test-out only when eligible, and tests the world out when every term stays proficient", async () =>
	{
		const proficient = { ease: 2.5, intervalDays: 8, repetitions: 3, mastery: "proficient" as const, lastReviewedAt: "2026-10-01T09:00:00.000Z" };
		const blocked = setup();
		await expect(blocked.handlers.startDrill.handle({ kind: "test-out", worldId: "world-1" })).rejects.toMatchObject({ appError: { code: "quest-locked" } });
		await expect(blocked.handlers.startDrill.handle({ kind: "test-out", worldId: "nowhere" })).rejects.toMatchObject({ appError: { code: "world-not-found" } });

		const { handlers, service } = setup({ prepare: (progress) => { progress.memory["term.a"] = proficient; progress.memory["term.b"] = proficient; } });
		const session = await handlers.startDrill.handle({ kind: "test-out", worldId: "world-1" });

		// Observer's card is not unlocked yet, so the test-out does not name it (A64, A322).
		expect(session.items.map((item) => item.itemId).sort()).toEqual(["term.a", "term.b"]);

		for (const sessionItem of session.items) await handlers.answerDrillItem.handle({ sessionId: session.sessionId, itemId: sessionItem.itemId, response: rightAnswerFor(sessionItem.item) });

		expect((await handlers.finishDrill.handle(session.sessionId)).testedOutWorldIds).toEqual(["world-1"]);
		expect((await handlers.getTestOutStatus.handle())["world-1"]?.testedOut).toBe(true);
		expect(service.getProgress().testedOutWorldIds).toEqual(["world-1"]);
	});

	it("opens the Parsons fallback after two failed submits, grades the order, and pays nothing", async () =>
	{
		const { handlers, service } = setup();
		await passConcept(handlers);

		await expect(handlers.startDrill.handle({ kind: "parsons-fallback", questId: "w1-build" })).rejects.toMatchObject({ appError: { code: "quest-locked" } });

		const rule = toRuleQuests(toPackOutlines(fixtureContent().packs));
		const build = rule.find((quest) => quest.id === "w1-build");
		if (!build) throw new Error("expected the build quest");
		await service.recordAttempt({ quest: build, score: 20, passed: false, compiled: true, isSubmit: true }, rule);
		await service.recordAttempt({ quest: build, score: 30, passed: false, compiled: true, isSubmit: true }, rule);

		const session = await handlers.startDrill.handle({ kind: "parsons-fallback", questId: "w1-build" });
		const [item] = session.items;
		if (!item) throw new Error("expected the Parsons item");

		expect(item.itemId).toBe(parsonsItemId(buildQuest.id, "order-1"));

		const wrong = await handlers.answerDrillItem.handle({ sessionId: session.sessionId, itemId: item.itemId, response: { kind: "order", lineIds: ["line-1", "line-0", "distractor-0"] } });
		expect(wrong).toMatchObject({ correct: false, modelAnswer: "first();\nsecond();\n}" });

		const outcome = await handlers.finishDrill.handle(session.sessionId);
		expect(outcome.xpGained).toBe(0);
	});

	it("refuses the Parsons fallback on a quest without a reorder exercise", async () =>
	{
		const { handlers } = setup();

		await expect(handlers.startDrill.handle({ kind: "parsons-fallback", questId: conceptQuest.id })).rejects.toMatchObject({ appError: { code: "invalid-payload" } });
	});
});

describe("M1.6b fix round 1", () =>
{
	const proficient = { ease: 2.5, intervalDays: 8, repetitions: 3, mastery: "proficient" as const, lastReviewedAt: "2026-10-01T09:00:00.000Z" };

	it("lets practice drills run but pays no XP, streak, or daily drill credit without a scheduled due item (A320)", async () =>
	{
		const { handlers, service, clock } = setup();
		await passConcept(handlers);
		await handlers.getDailyQuest.handle();
		await handlers.chooseDailyOffer.handle(0);
		const streakBefore = service.getProgress().streak.count;

		for (let round = 0; round < 4; round++)
		{
			const practice = await handlers.startDrill.handle({ kind: "due" });
			for (const item of practice.items) await handlers.answerDrillItem.handle({ sessionId: practice.sessionId, itemId: item.itemId, response: rightAnswerFor(item.item) });

			const outcome = await handlers.finishDrill.handle(practice.sessionId);
			expect(outcome.xpGained).toBe(0);
			expect(outcome.chest).toBeUndefined();
		}

		expect(service.getProgress().streak.count).toBe(streakBefore);
		expect(service.getProgress().daily.done).toBe(false);

		clock.advanceDays(1);
		const due = await handlers.startDrill.handle({ kind: "due" });
		for (const item of due.items) await handlers.answerDrillItem.handle({ sessionId: due.sessionId, itemId: item.itemId, response: rightAnswerFor(item.item) });
		expect((await handlers.finishDrill.handle(due.sessionId)).xpGained).toBe(10);
	});

	it("never shows the same question twice in one drill, even when it asks about two due terms", async () =>
	{
		const { handlers, clock } = setup();
		await passConcept(handlers);
		clock.advanceDays(1);

		const session = await handlers.startDrill.handle({ kind: "due" });
		const questionKeys = session.items.map((item) => (item.item.source === "parsons" ? item.itemId : `${item.item.source}/${"questId" in item.item ? item.item.questId : item.item.patternId}/${item.item.question.id}`));

		expect(session.items.map((item) => item.itemId)).toEqual(expect.arrayContaining(["term.a", "term.b"]));
		expect(new Set(questionKeys).size).toBe(questionKeys.length);
	});

	it("tests out a world whose quests list a term no concept quest teaches, leaving that term out (A322)", async () =>
	{
		const content = fixtureContent();
		const world = content.packs[0]?.worlds[0];
		const build = world?.quests.find((quest) => quest.id === "w1-build");
		if (!build) throw new Error("expected the build quest");
		build.terms = ["term.a", "term.untaught"];

		const { handlers } = setup({ content, prepare: (progress) => { progress.memory["term.a"] = proficient; progress.memory["term.b"] = proficient; } });

		expect((await handlers.getTestOutStatus.handle())["world-1"]).toEqual({ eligible: true, testedOut: false });

		const session = await handlers.startDrill.handle({ kind: "test-out", worldId: "world-1" });
		expect(session.items.map((item) => item.itemId)).not.toContain("term.untaught");

		for (const item of session.items) await handlers.answerDrillItem.handle({ sessionId: session.sessionId, itemId: item.itemId, response: rightAnswerFor(item.item) });
		expect((await handlers.finishDrill.handle(session.sessionId)).testedOutWorldIds).toEqual(["world-1"]);
	});

	it("includes a world's pattern in its test-out only once that pattern's card is unlocked (A64, A322)", async () =>
	{
		const { handlers } = setup({ prepare: (progress) =>
		{
			progress.memory["term.a"] = proficient;
			progress.memory["term.b"] = proficient;
			progress.patternCards["observer"] = { tier: "bronze", useCasesPassed: ["w1-build"] };
		} });

		const session = await handlers.startDrill.handle({ kind: "test-out", worldId: "world-1" });

		expect(session.items.map((item) => item.itemId).sort()).toEqual(["observer", "term.a", "term.b"]);
	});
});

describe("M1.6b fix round 2", () =>
{
	it("never reviews overflow items as filler: with 30 due, only the first 20 move today, however many drills run (A321)", async () =>
	{
		const termIds = Array.from({ length: 30 }, (_, index) => `term.${String(index).padStart(2, "0")}`);
		const content = fixtureContent();
		const world = content.packs[0]?.worlds[0];
		const lesson = world?.quests.find((quest) => quest.id === "w1-concept");
		if (!lesson || lesson.kind !== "concept") throw new Error("expected the concept quest");
		lesson.terms = termIds;
		lesson.questions = termIds.map((termId, index) => ({ id: `q-${index}`, type: "multiple-choice" as const, prompt: `About ${termId}?`, choices: ["no", "yes"], answerIndex: 1, explanation: "" }));

		// Spread random picks, so filler would reach the overflow items if it were allowed to.
		const { handlers, service } = setup({ content, random: [0.95, 0.6, 0.3, 0.8, 0.1], prepare: (progress) =>
		{
			progress.quests["w1-concept"] = { status: "passed", bestScore: 100, attempts: 1, hintsRevealed: 0, solutionViewed: false, seerStoneSpent: false, effortXpGranted: false, savedFiles: {}, lastAttemptAt: "2026-10-20T09:00:00.000Z" };
			termIds.forEach((termId, index) =>
			{
				progress.memory[termId] = { ease: 2.5, intervalDays: 1, repetitions: 1, mastery: "familiar", lastReviewedAt: "2026-10-20T08:00:00.000Z" };
				progress.schedule[termId] = new Date(2026, 9, 21, 7, index).toISOString();
			});
		} });
		const scheduleBefore = { ...service.getProgress().schedule };

		for (let drill = 0; drill < 12; drill++)
		{
			const session = await handlers.startDrill.handle({ kind: "due" });
			for (const item of session.items) await handlers.answerDrillItem.handle({ sessionId: session.sessionId, itemId: item.itemId, response: rightAnswerFor(item.item) });
			await handlers.finishDrill.handle(session.sessionId);
		}

		const scheduleAfter = service.getProgress().schedule;
		const moved = termIds.filter((termId) => scheduleAfter[termId] !== scheduleBefore[termId]);

		expect(moved).toEqual(termIds.slice(0, 20));
		expect(await handlers.getDrillSummary.handle()).toMatchObject({ dueToday: 0, overflow: 10 });
	});
});

