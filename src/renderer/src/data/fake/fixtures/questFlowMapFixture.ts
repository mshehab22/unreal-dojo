// The map for the "quests" fake scenario: the returning learner's map with Foundations world 1 swapped for the real Pack 1 World 1, so every stage opens real content.
import { WORLD_ONE } from "./fakeQuests";
import { MAP_FIXTURE, type PackFixture, type StageFixture } from "./mapFixture";

/** Real World 1 as map stages: every quest open except the boss, which waits for the rest of the world. */
function worldOneStages(): StageFixture[]
{
	return WORLD_ONE.quests.map((quest) => ({
		id: quest.id,
		title: quest.title,
		kind: quest.kind,
		difficulty: quest.difficulty,
		xp: quest.xp,
		minutes: quest.estimatedMinutes,
		terms: quest.terms,
		skills: quest.skills,
		patterns: quest.patterns,
		prerequisites: quest.prerequisites,
		...(quest.kind === "build" || quest.kind === "refactor" ? { scaffold: quest.scaffold } : {}),
		status: quest.kind === "boss" ? "locked" : "available",
		...(quest.kind === "boss" ? { lockedReason: "Pass every other quest in this world first." } : {}),
	}));
}

/** The returning map with the real World 1 as the first Foundations world. */
export function questFlowMapFixture(): PackFixture[]
{
	return MAP_FIXTURE.map((pack) =>
	{
		if (pack.id !== "foundations") return pack;

		const [, ...laterWorlds] = pack.worlds;

		return { ...pack, worlds: [{ id: WORLD_ONE.id, title: WORLD_ONE.title, summary: WORLD_ONE.summary, stages: worldOneStages() }, ...laterWorlds] };
	});
}
