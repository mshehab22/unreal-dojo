// Warns when a quest lists a term no concept quest earlier in course order teaches (A72), so authors can teach it sooner.
import type { ContentProblem } from "../../../src/shared/types/content";
import type { ContentCheck } from "../ContentCheck";
import { packQuests, warningAt } from "./checkHelpers";

/**
 * Course order is the order of `packQuests` (pack, then world, then quest order). A concept quest teaches every term in
 * its `terms[]`, so it never warns about its own terms (A312). Every other quest warns once per term that no earlier
 * concept quest teaches, naming where the term is first taught, or that no concept quest teaches it. Examples are not
 * part of the course and are skipped.
 */
export const termOrderCheck: ContentCheck = {
	name: "term order",
	run(input)
	{
		const problems: ContentProblem[] = [];
		const records = packQuests(input);
		const firstTaught = new Map<string, { questId: string; file: string }>();

		for (const { quest, file } of records)
		{
			if (quest.kind !== "concept") continue;

			for (const term of quest.terms) if (!firstTaught.has(term)) firstTaught.set(term, { questId: quest.id, file });
		}

		const taughtSoFar = new Set<string>();

		for (const { quest, file } of records)
		{
			if (quest.kind === "concept")
			{
				quest.terms.forEach((term) => taughtSoFar.add(term));
				continue;
			}

			for (const term of quest.terms)
			{
				if (taughtSoFar.has(term)) continue;

				const first = firstTaught.get(term);
				const where = first === undefined ? "never taught by a concept quest" : `first taught later, by "${first.questId}" (${first.file})`;

				problems.push(warningAt(file, `terms: "${term}" is not taught by any earlier concept quest; ${where}. It links but does not gate this quest (A72)`, "front matter"));
			}
		}

		return problems;
	},
};
