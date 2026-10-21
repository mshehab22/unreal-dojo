// Checks that each world's build quests fade from worked toward blank and never step back (D14).
import type { ContentProblem, ScaffoldLevel } from "../../../src/shared/types/content";
import type { ContentCheck } from "../ContentCheck";
import { errorAt } from "./checkHelpers";

/** Scaffold levels from most help to least. */
const LADDER: readonly ScaffoldLevel[] = ["worked", "faded", "stub", "blank"];

/**
 * In each world, in quest order: no build quest has more help than the one before it, and with two or more build
 * quests the first is worked or faded and the last is stub or blank. A world with one build quest only has nothing
 * to fade, so the first and last rule is skipped there (A204). Refactor quests are not on the ladder.
 */
export const fadeLadderCheck: ContentCheck = {
	name: "fade ladder",
	run(input)
	{
		const problems: ContentProblem[] = [];

		for (const pack of input.content.packs)
		{
			for (const world of pack.worlds)
			{
				const builds = world.quests.filter((quest) => quest.kind === "build");
				const fileOf = (id: string): string => input.content.questSources[id] ?? `packs/${pack.id}`;

				builds.forEach((quest, index) =>
				{
					const previous = builds[index - 1];

					if (previous !== undefined && LADDER.indexOf(quest.scaffold) < LADDER.indexOf(previous.scaffold))
					{
						problems.push(errorAt(fileOf(quest.id), `scaffold steps back from ${previous.scaffold} ("${previous.id}") to ${quest.scaffold}; a world fades worked, faded, stub, blank`, "front matter"));
					}
				});

				const first = builds[0];
				const last = builds[builds.length - 1];

				if (builds.length < 2 || first === undefined || last === undefined) continue;

				if (first.scaffold !== "worked" && first.scaffold !== "faded") problems.push(errorAt(fileOf(first.id), `the world's first build quest must be worked or faded, not ${first.scaffold}`, "front matter"));
				if (last.scaffold !== "stub" && last.scaffold !== "blank") problems.push(errorAt(fileOf(last.id), `the world's last build quest must be stub or blank, not ${last.scaffold}`, "front matter"));
			}
		}

		return problems;
	},
};
