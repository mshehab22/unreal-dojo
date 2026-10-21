// The fake's full quests: the real Pack 1 World 1 (generated from content by tools/write-fake-world-fixture.ts), and stand-ins for the invented map stages.
import type { LearnerQuest, LearnerWorld, QuestOutline } from "@shared/types/catalog";
import type { AuthoredQuestKind } from "@shared/types/content";

import worldOneJson from "./worldOneFixture.json";

/** The fixture's shape, as tools/fake/buildFakeWorldFixture.ts writes it. */
interface WorldOneFixture
{
	packId: string;
	world: LearnerWorld;
	hints: Record<string, string[]>;
}

/** The real World 1, typed. */
const WORLD_ONE_FIXTURE = worldOneJson as unknown as WorldOneFixture;

/** The pack the real World 1 belongs to. */
export const WORLD_ONE_PACK_ID = WORLD_ONE_FIXTURE.packId;

/** The real World 1 with its full quests, hint texts left out. */
export const WORLD_ONE: LearnerWorld = WORLD_ONE_FIXTURE.world;

/** The real quest each kind's stand-in copies, for invented map stages. */
const STAND_IN_SOURCE: Readonly<Record<AuthoredQuestKind, string>> = {
	concept: "f1-uobject-and-actor",
	build: "f1-training-dummy",
	refactor: "f1-training-dummy",
	breakdown: "f1-dash-with-cooldown",
	boss: "f1-boss-training-yard",
};

/** A real World 1 quest by id. */
export function worldOneQuest(questId: string): LearnerQuest | undefined
{
	return WORLD_ONE.quests.find((quest) => quest.id === questId);
}

/** The hint texts of a quest; stand-ins borrow their source quest's hints. */
export function hintTextsFor(questId: string, outline: QuestOutline | undefined): string[]
{
	const sourceId = WORLD_ONE_FIXTURE.hints[questId] ? questId : outline ? STAND_IN_SOURCE[outline.kind] : questId;

	return WORLD_ONE_FIXTURE.hints[sourceId] ?? [];
}

/** A full quest for an invented map stage: the real quest of the same kind, under the stage's id, title, and numbers. */
export function standInQuest(outline: QuestOutline): LearnerQuest
{
	const source = worldOneQuest(STAND_IN_SOURCE[outline.kind]);

	if (!source) throw new Error(`World 1 fixture has no ${outline.kind} quest to stand in.`);

	const copy = structuredClone(source) as LearnerQuest;
	const kind = outline.kind === "refactor" && copy.kind === "build" ? "refactor" : copy.kind;

	return { ...copy, kind, id: outline.id, title: outline.title, xp: outline.xp, difficulty: outline.difficulty, estimatedMinutes: outline.estimatedMinutes, patterns: outline.patterns } as LearnerQuest;
}
