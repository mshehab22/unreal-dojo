// Turns the real Pack 1 World 1 content into the fixture the renderer's fake serves, so quest screens run on real quests without the main process.
import { toLearnerWorld } from "../../src/main/content/contentViews";
import type { LearnerWorld } from "../../src/shared/types/catalog";
import type { LoadedContent } from "../../src/shared/types/content";

/** The pack and world the fake serves in full. */
export const FAKE_WORLD_PACK_ID = "foundations";

/** The world id inside that pack. */
export const FAKE_WORLD_ID = "objects-and-reflection";

/** What the fake needs: the world as a quest screen receives it, plus the hint texts that only `revealHint` may hand out (A222) and the reference files only `viewSolution` may hand out (A1390). */
export interface FakeWorldFixture
{
	packId: string;
	world: LearnerWorld;
	hints: Record<string, string[]>;

	/** Reference solution files by quest id, then file name: only each build or refactor quest's own files. */
	solutions: Record<string, Record<string, string>>;
}

/** Picks the world out of loaded content and splits off its hint texts; `solutions` are the reference files read from `tools/solutions` by quest id. Throws when the world is missing. */
export function buildFakeWorldFixture(content: LoadedContent, solutions: Record<string, Record<string, string>> = {}): FakeWorldFixture
{
	const pack = content.packs.find((candidate) => candidate.id === FAKE_WORLD_PACK_ID);
	const world = pack?.worlds.find((candidate) => candidate.id === FAKE_WORLD_ID);

	if (!world) throw new Error(`The content has no world ${FAKE_WORLD_PACK_ID}/${FAKE_WORLD_ID}.`);

	const hints: Record<string, string[]> = {};
	const ownSolutions: Record<string, Record<string, string>> = {};

	for (const quest of world.quests)
	{
		if (quest.kind !== "build" && quest.kind !== "refactor") continue;

		hints[quest.id] = [...quest.hints];

		const fileNames = new Set(quest.files.map((file) => file.name));
		const files = Object.fromEntries(Object.entries(solutions[quest.id] ?? {}).filter(([name]) => fileNames.has(name)));

		if (Object.keys(files).length > 0) ownSolutions[quest.id] = files;
	}

	return { packId: FAKE_WORLD_PACK_ID, world: toLearnerWorld(world), hints, solutions: ownSolutions };
}
