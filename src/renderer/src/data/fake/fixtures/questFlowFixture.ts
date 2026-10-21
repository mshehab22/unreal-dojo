// The "quests" fake scenario: the returning learner with Pack 1 World 1 not started, so every quest screen can be played from the beginning (A351).
// The map is the M2.1 map, whose first world already mirrors the real World 1 (A390); only its standing and the save's World 1 history are reset.
import type { PlayerProgress } from "@shared/types/progress";

import { WORLD_ONE } from "./fakeQuests";
import { MAP_FIXTURE, type PackFixture } from "./mapFixture";
import { returningProgressFixture } from "./progressFixture";

/** True for a quest of the real World 1. */
function isWorldOneQuest(questId: string): boolean
{
	return WORLD_ONE.quests.some((quest) => quest.id === questId);
}

/** The returning map with World 1 open: every stage available except the boss, which waits for the rest of the world. */
export function questFlowMapFixture(): PackFixture[]
{
	return MAP_FIXTURE.map((pack) => ({
		...pack,
		worlds: pack.worlds.map((world) =>
		{
			if (world.id !== WORLD_ONE.id) return world;

			return {
				...world,
				stages: world.stages.map(({ bestScore: _bestScore, dueForRematch: _dueForRematch, lockedReason: _lockedReason, ...stage }) =>
					stage.kind === "boss" ? { ...stage, status: "locked" as const, lockedReason: "Pass every other quest in this world first." } : { ...stage, status: "available" as const },
				),
			};
		}),
	}));
}

/** The returning save with World 1's quests, attempts, rematches, and card use cases removed; cards left with no use case are dropped. */
export function questFlowProgressFixture(): PlayerProgress
{
	const progress = returningProgressFixture();
	const patternCards: PlayerProgress["patternCards"] = {};

	for (const [patternId, card] of Object.entries(progress.patternCards))
	{
		const useCasesPassed = card.useCasesPassed.filter((questId) => !isWorldOneQuest(questId));

		if (useCasesPassed.length > 0) patternCards[patternId] = { ...card, useCasesPassed };
	}

	return {
		...progress,
		quests: Object.fromEntries(Object.entries(progress.quests).filter(([questId]) => !isWorldOneQuest(questId))),
		attempts: progress.attempts.filter((attempt) => !isWorldOneQuest(attempt.questId)),
		rematches: Object.fromEntries(Object.entries(progress.rematches).filter(([questId]) => !isWorldOneQuest(questId))),
		patternCards,
	};
}
