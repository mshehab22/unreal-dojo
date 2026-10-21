// Test-outs are keyed by pack and world, so two packs can reuse a world id; test-outs saved by bare world id are qualified once content loads (A700).
import { describe, expect, it } from "vitest";

import type { ConceptQuest, LoadedContent } from "@shared/types/content";
import { worldKeyOf, type QuestProgress } from "@shared/types/progress";

import { UnlockGraph } from "../../src/main/services/progress/UnlockGraph";
import { conceptQuest, createTestProgressContent, fixtureContent } from "../support/contentFixture";
import { makeQuest } from "../support/progressFixtures";

const proficient = { ease: 2.5, intervalDays: 8, repetitions: 3, mastery: "proficient" as const, lastReviewedAt: "2026-10-01T09:00:00.000Z" };

/** The fixture plus a second pack whose first world reuses the id `world-1`, teaching other terms. */
function twoPacksSharingAWorldId(): LoadedContent
{
	const content = fixtureContent();
	const otherLesson: ConceptQuest = { ...conceptQuest, id: "p2-concept", terms: ["term.x"], prerequisites: [] };

	content.packs.push({ id: "pack-2", title: "Pack 2", summary: "", order: 2, worlds: [{ id: "world-1", title: "Pack 2 World 1", summary: "", order: 1, quests: [otherLesson] }] });

	return content;
}

describe("test-out keys by pack and world", () =>
{
	it("gives each pack's world its own test-out status even when the world ids match", async () =>
	{
		const { content } = createTestProgressContent({ content: twoPacksSharingAWorldId(), prepare: (progress) => { progress.memory["term.a"] = proficient; progress.memory["term.b"] = proficient; } });
		const status = await content.getTestOutStatus();

		expect(Object.keys(status).sort()).toEqual(["pack-1/world-1", "pack-1/world-2", "pack-2/world-1"]);
		expect(status["pack-1/world-1"]).toEqual({ eligible: true, testedOut: false });
		expect(status["pack-2/world-1"]).toEqual({ eligible: false, testedOut: false, reason: "1 term is not proficient yet." });
	});

	it("tests out only the requested pack's world", async () =>
	{
		const { content, service } = createTestProgressContent({ content: twoPacksSharingAWorldId(), prepare: (progress) => { progress.memory["term.x"] = proficient; } });
		const session = await content.startDrill({ kind: "test-out", packId: "pack-2", worldId: "world-1" });

		for (const item of session.items) await content.answerDrillItem({ sessionId: session.sessionId, itemId: item.itemId, response: item.item.source === "parsons" ? { kind: "order", lineIds: [] } : { kind: "choice", choice: String(item.item.question.type === "multiple-choice" ? item.item.question.answerIndex : "") } });

		expect((await content.finishDrill(session.sessionId)).testedOutWorldIds).toEqual(["pack-2/world-1"]);
		expect(service.getProgress().testedOutWorldIds).toEqual(["pack-2/world-1"]);
		expect((await content.getTestOutStatus())["pack-1/world-1"]?.testedOut).toBe(false);
	});

	it("refuses a test-out for a world id in the wrong pack", async () =>
	{
		const { content } = createTestProgressContent({ content: twoPacksSharingAWorldId() });

		await expect(content.startDrill({ kind: "test-out", packId: "pack-9", worldId: "world-1" })).rejects.toMatchObject({ appError: { code: "world-not-found", detail: "pack-9/world-1" } });
	});

	it("lets only the tested-out pack's worked quests be skipped in the unlock graph", () =>
	{
		const packOneBuild = makeQuest({ id: "p1-build", packId: "pack-1", worldId: "world-1", order: 2, prerequisites: ["p1-lesson"], scaffold: "worked" });
		const packTwoBuild = makeQuest({ id: "p2-build", packId: "pack-2", packOrder: 2, worldId: "world-1", order: 2, prerequisites: ["p2-lesson"], scaffold: "worked" });
		const lessons = [makeQuest({ id: "p1-lesson", kind: "concept", packId: "pack-1", worldId: "world-1" }), makeQuest({ id: "p2-lesson", kind: "concept", packId: "pack-2", packOrder: 2, worldId: "world-1" })];
		const quests: Record<string, QuestProgress> = {};
		const availability = new UnlockGraph([...lessons, packOneBuild, packTwoBuild]).availability({ now: new Date(), quests, masteryOf: () => undefined, testedOutWorldIds: [worldKeyOf("pack-2", "world-1")], rematches: {} });

		expect(availability["p2-build"]?.skippable).toBe(true);
		expect(availability["p1-build"]?.skippable).toBe(false);
	});
});

describe("test-outs saved by bare world id", () =>
{
	it("qualifies a bare world id with its pack once content loads", async () =>
	{
		const { content, service } = createTestProgressContent({ prepare: (progress) => { progress.testedOutWorldIds = ["world-1"]; } });

		expect((await content.getTestOutStatus())["pack-1/world-1"]?.testedOut).toBe(true);
		expect(service.getProgress().testedOutWorldIds).toEqual(["pack-1/world-1"]);
	});

	it("qualifies a bare id to every pack that has that world id (what it meant before), and keeps ids no loaded world has", async () =>
	{
		const { content, service } = createTestProgressContent({ content: twoPacksSharingAWorldId(), prepare: (progress) => { progress.testedOutWorldIds = ["world-1", "pack-1/world-2", "gone-world"]; } });

		await content.getQuestAvailability();

		expect(service.getProgress().testedOutWorldIds).toEqual(["pack-1/world-1", "pack-2/world-1", "pack-1/world-2", "gone-world"]);
	});

	it("leaves already qualified keys untouched and writes nothing when there is nothing to qualify", async () =>
	{
		const { content, service, fileSystem } = createTestProgressContent({ prepare: (progress) => { progress.testedOutWorldIds = ["pack-1/world-1"]; } });

		await content.getTestOutStatus();

		expect(service.getProgress().testedOutWorldIds).toEqual(["pack-1/world-1"]);
		expect(fileSystem.files.size).toBe(0);
	});
});
