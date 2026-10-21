// Turns the real Pack 1 World 1 content into the fixture the renderer's fake serves, so quest screens run on real quests without the main process.
import { toLearnerWorld } from "../../src/main/content/contentViews";
import type { LearnerWorld } from "../../src/shared/types/catalog";
import type { LoadedContent } from "../../src/shared/types/content";

/** The pack and world the fake serves in full. */
export const FAKE_WORLD_PACK_ID = "foundations";

/** The world id inside that pack. */
export const FAKE_WORLD_ID = "objects-and-reflection";

/** What the fake needs: the world as a quest screen receives it, plus the hint texts that only `revealHint` may hand out (A222). */
export interface FakeWorldFixture
{
	packId: string;
	world: LearnerWorld;
	hints: Record<string, string[]>;
}

/** Picks the world out of loaded content and splits off its hint texts. Throws when the world is missing. */
export function buildFakeWorldFixture(content: LoadedContent): FakeWorldFixture
{
	const pack = content.packs.find((candidate) => candidate.id === FAKE_WORLD_PACK_ID);
	const world = pack?.worlds.find((candidate) => candidate.id === FAKE_WORLD_ID);

	if (!world) throw new Error(`The content has no world ${FAKE_WORLD_PACK_ID}/${FAKE_WORLD_ID}.`);

	const hints: Record<string, string[]> = {};

	for (const quest of world.quests)
	{
		if (quest.kind === "build" || quest.kind === "refactor") hints[quest.id] = [...quest.hints];
	}

	return { packId: FAKE_WORLD_PACK_ID, world: toLearnerWorld(world), hints };
}
