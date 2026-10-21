// Prints the renderer fake's World 1 fixture as JSON, built from the real content. The build and the unit tests call it, so there is no copy to drift (A365).
import { resolve } from "node:path";

import { ContentLoader } from "../../src/main/services/content";
import { buildFakeWorldFixture } from "./buildFakeWorldFixture";

/** Loads `content/` (run from the project folder) and writes the fixture to standard output. */
async function main(): Promise<void>
{
	const content = await new ContentLoader(resolve("content")).load();

	process.stdout.write(JSON.stringify(buildFakeWorldFixture(content)));
}

await main();
