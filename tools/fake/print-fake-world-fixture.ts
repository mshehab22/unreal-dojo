// Prints the renderer fake's World 1 fixture as JSON, built from the real content. The build and the unit tests call it, so there is no copy to drift (A365).
import { resolve } from "node:path";

import { ContentLoader } from "../../src/main/services/content";
import { SolutionFolderReader } from "../../src/main/services/progress/SolutionFolderReader";
import { buildFakeWorldFixture, FAKE_WORLD_ID, FAKE_WORLD_PACK_ID } from "./buildFakeWorldFixture";

/** Loads `content/` and the world's reference solutions from `tools/solutions` (run from the project folder) and writes the fixture to standard output. */
async function main(): Promise<void>
{
	const content = await new ContentLoader(resolve("content")).load();
	const world = content.packs.find((pack) => pack.id === FAKE_WORLD_PACK_ID)?.worlds.find((candidate) => candidate.id === FAKE_WORLD_ID);
	const reader = new SolutionFolderReader(resolve("tools", "solutions"));
	const solutions: Record<string, Record<string, string>> = {};

	for (const quest of world?.quests ?? [])
	{
		const files = await reader.filesOf(quest.id);

		if (files) solutions[quest.id] = files;
	}

	process.stdout.write(JSON.stringify(buildFakeWorldFixture(content, solutions)));
}

await main();
