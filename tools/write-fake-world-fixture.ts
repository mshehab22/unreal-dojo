// Writes the renderer fake's World 1 fixture from the real content. Run after World 1 content changes: npx tsx tools/write-fake-world-fixture.ts
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { ContentLoader } from "../src/main/services/content";
import { buildFakeWorldFixture } from "./fake/buildFakeWorldFixture";

/** Where the fixture lives. A unit test fails when it drifts from the content. */
export const FAKE_WORLD_FIXTURE_PATH = resolve(import.meta.dirname, "..", "src/renderer/src/data/fake/fixtures/worldOneFixture.json");

/** Loads the content, builds the fixture, and writes it with a trailing newline. */
async function main(): Promise<void>
{
	const content = await new ContentLoader(resolve(import.meta.dirname, "..", "content")).load();
	const fixture = buildFakeWorldFixture(content);

	await writeFile(FAKE_WORLD_FIXTURE_PATH, `${JSON.stringify(fixture, null, "\t")}\n`);
	console.log(`Wrote ${fixture.world.quests.length} quests to ${FAKE_WORLD_FIXTURE_PATH}`);
}

await main();
