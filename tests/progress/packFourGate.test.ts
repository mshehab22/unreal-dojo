// The Pack 4 gate against the real shipped content: the Systems Lab stays locked until the Communication and Component bosses are passed (A68, A510).
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import type { QuestProgress } from "@shared/types/progress";

import { toPackOutlines } from "../../src/main/content/contentViews";
import { ContentLoader } from "../../src/main/services/content/ContentLoader";
import { createNewQuestProgress } from "../../src/main/services/progress/createNewProgress";
import type { RuleQuest } from "../../src/main/services/progress/RuleQuest";
import { toRuleQuests } from "../../src/main/services/progress/toRuleQuests";
import { UnlockGraph, type UnlockState } from "../../src/main/services/progress/UnlockGraph";

/** The two bosses that open Pack 4, by quest id in the shipped content. */
const COMMUNICATION_BOSS = "f5-boss-beacon-drill";
const COMPONENT_BOSS = "p9-boss-prop-gauntlet";

let quests: RuleQuest[];
let graph: UnlockGraph;

/** An unlock state in which exactly these quests are passed. */
function stateWithPassed(passedIds: string[]): UnlockState
{
	const passed: QuestProgress = { ...createNewQuestProgress(), status: "passed" };

	return {
		now: new Date("2026-10-27T12:00:00.000Z"),
		quests: Object.fromEntries(passedIds.map((questId) => [questId, passed])),
		masteryOf: () => "mastered",
		testedOutWorldIds: [],
		rematches: {},
	};
}

beforeAll(async () =>
{
	const content = await new ContentLoader(join(process.cwd(), "content")).load();

	quests = toRuleQuests(toPackOutlines(content.packs));
	graph = new UnlockGraph(quests);
});

describe("Pack 4 gate on the shipped content", () =>
{
	it("ships the Systems Lab as the fourth pack, with the two gate bosses present", () =>
	{
		const systemsQuests = quests.filter((quest) => quest.packId === "systems");

		expect(systemsQuests.length).toBeGreaterThan(0);
		expect(systemsQuests.every((quest) => quest.packOrder === 4)).toBe(true);
		expect(quests.some((quest) => quest.id === COMMUNICATION_BOSS && quest.kind === "boss" && quest.worldId === "communication")).toBe(true);
		expect(quests.some((quest) => quest.id === COMPONENT_BOSS && quest.kind === "boss" && quest.worldId === "component")).toBe(true);
	});

	it("locks every Systems Lab quest until both gate bosses are passed", () =>
	{
		const systemsIds = quests.filter((quest) => quest.packId === "systems").map((quest) => quest.id);
		const none = graph.availability(stateWithPassed([]));
		const onlyCommunication = graph.availability(stateWithPassed([COMMUNICATION_BOSS]));
		const onlyComponent = graph.availability(stateWithPassed([COMPONENT_BOSS]));

		for (const questId of systemsIds)
		{
			expect(none[questId]?.status, questId).toBe("locked");
			expect(onlyCommunication[questId]?.status, questId).toBe("locked");
			expect(onlyComponent[questId]?.status, questId).toBe("locked");
		}
	});

	it("locks a later quest on the gate alone, even with its own prerequisites passed", () =>
	{
		const withoutBosses = graph.availability(stateWithPassed(["s1-inventory-plan"]))["s1-item-data"];
		const withBosses = graph.availability(stateWithPassed(["s1-inventory-plan", COMMUNICATION_BOSS, COMPONENT_BOSS]))["s1-item-data"];

		expect(withoutBosses?.status).toBe("locked");
		expect(withoutBosses?.lockedReason).toMatch(/^Beat /);
		expect(withBosses?.status).toBe("available");
	});

	it("opens the first Systems Lab quest, always available inside an open pack, once both bosses are passed", () =>
	{
		const first = quests.find((quest) => quest.packId === "systems" && quest.worldOrder === 1 && quest.order === 1);

		expect(first).toBeDefined();
		expect(graph.availability(stateWithPassed([COMMUNICATION_BOSS]))[first?.id ?? ""]?.status).toBe("locked");
		expect(graph.availability(stateWithPassed([COMMUNICATION_BOSS, COMPONENT_BOSS]))[first?.id ?? ""]?.status).toBe("available");
	});
});
