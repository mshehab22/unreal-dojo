// A Vite plugin that serves `virtual:dojo-fake-world`: the renderer fake's World 1, built from `content/` when the app or the unit tests are built (A365).
import type { Plugin } from "vite";

import { readFakeWorldFixtureJson } from "./readFakeWorldFixture";

/** The import the fake uses. */
const MODULE_ID = "virtual:dojo-fake-world";

/** Vite's marker for a module that is not a file. */
const RESOLVED_ID = `\0${MODULE_ID}`;

/** What the fake serves when World 1 cannot be built: an empty world, so a content mistake never stops the real app from building. */
const EMPTY_WORLD = JSON.stringify({ packId: "foundations", world: { id: "objects-and-reflection", title: "World 1 (content did not load)", summary: "", order: 1, quests: [] }, hints: {}, solutions: {} });

/** The plugin: the module is the fixture's JSON as a default export, read once per build. A failed read warns and serves an empty world. */
export function fakeWorldFixture(): Plugin
{
	let cached: string | undefined;

	return {
		name: "dojo-fake-world",
		resolveId: (id) => (id === MODULE_ID ? RESOLVED_ID : undefined),
		load(id)
		{
			if (id !== RESOLVED_ID) return undefined;

			if (cached === undefined)
			{
				try
				{
					cached = readFakeWorldFixtureJson();
				}
				catch (error)
				{
					this.warn(`The fake's World 1 could not be built from content/, so it serves an empty world. Run npx tsx tools/verify-content.ts to see why. ${error instanceof Error ? error.message.split("\n")[0] : ""}`);
					cached = EMPTY_WORLD;
				}
			}

			return `export default ${cached};`;
		},
	};
}
