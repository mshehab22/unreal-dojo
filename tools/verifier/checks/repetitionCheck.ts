// Checks the "reuse on purpose" rule: from world 3 of each pack on, each world reuses an earlier pattern or term.
import type { ContentProblem } from "../../../src/shared/types/content";
import type { ContentCheck } from "../ContentCheck";
import { errorAt } from "./checkHelpers";

/** The first world (0-based) the rule applies to: world 3. */
const FIRST_CHECKED_WORLD = 2;

/** Author rule 10: some quest in each world from world 3 lists a pattern or term an earlier world of the pack already used. */
export const repetitionCheck: ContentCheck = {
	name: "repetition",
	run(input)
	{
		const problems: ContentProblem[] = [];

		for (const pack of input.content.packs)
		{
			const earlier = new Set<string>();

			pack.worlds.forEach((world, index) =>
			{
				const used = world.quests.flatMap((quest) => [...quest.patterns.map((id) => `pattern:${id}`), ...quest.terms.map((id) => `term:${id}`)]);

				if (index >= FIRST_CHECKED_WORLD && world.quests.length > 0 && !used.some((key) => earlier.has(key)))
				{
					const folder = `packs/${pack.id}/worlds/${String(world.order).padStart(2, "0")}-${world.id}`;

					problems.push(errorAt(`${folder}/world.json`, "no quest in this world lists a pattern or term from an earlier world of the pack (reuse on purpose from world 3 on)"));
				}

				used.forEach((key) => earlier.add(key));
			});
		}

		return problems;
	},
};
