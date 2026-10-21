// Checks per-quest shape the schema leaves open: rubric bullet counts, a non-empty concepts list, and gradable concept questions.
import type { ContentProblem } from "../../../src/shared/types/content";
import type { ContentCheck } from "../ContentCheck";
import { errorAt } from "./checkHelpers";

/** Rubric bullets every build, refactor, and breakdown quest needs (author rule 14). */
const RUBRIC_MINIMUM = 5;
const RUBRIC_MAXIMUM = 6;

/** Integration rubric bullets every boss needs. */
const BOSS_RUBRIC_SIZE = 8;

/** Rubric sizes, concepts, and, on concept quests, at least one question a grader can mark without AI, for every pack quest and example. */
export const questShapeCheck: ContentCheck = {
	name: "quest shape",
	run(input)
	{
		const problems: ContentProblem[] = [];

		for (const { quest, file } of input.quests)
		{
			if (quest.concepts.length === 0) problems.push(errorAt(file, "concepts: list at least one idea this quest teaches", "front matter"));

			if (quest.kind === "concept" && quest.questions.every((question) => question.type === "explain-in-one-sentence"))
			{
				problems.push(errorAt(file, "needs at least one question that is not explain-in-one-sentence, so the quest can be graded without an AI reviewer", "Questions"));
			}

			if (quest.kind === "build" || quest.kind === "refactor" || quest.kind === "breakdown")
			{
				const size = quest.rubric.length;

				if (size < RUBRIC_MINIMUM || size > RUBRIC_MAXIMUM) problems.push(errorAt(file, `expected ${RUBRIC_MINIMUM} to ${RUBRIC_MAXIMUM} rubric bullets, found ${size}`, "Rubric"));
			}

			if (quest.kind === "boss" && quest.integrationRubric.length !== BOSS_RUBRIC_SIZE)
			{
				problems.push(errorAt(file, `expected ${BOSS_RUBRIC_SIZE} integration rubric bullets, found ${quest.integrationRubric.length}`, "Integration Rubric"));
			}
		}

		return problems;
	},
};
