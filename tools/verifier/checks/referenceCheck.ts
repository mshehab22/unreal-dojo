// Checks that every id a quest, pattern card, or glossary entry points at exists and has the right kind.
import type { ContentProblem } from "../../../src/shared/types/content";
import type { ContentCheck } from "../ContentCheck";
import { errorAt } from "./checkHelpers";

/** Terms, patterns, prerequisites, boss pieces, pattern use cases, and glossary first quests. */
export const referenceCheck: ContentCheck = {
	name: "references",
	run(input)
	{
		const problems: ContentProblem[] = [];
		const glossaryIds = new Set(input.content.glossary.map((entry) => entry.id));
		const patternIds = new Set(input.content.patterns.map((card) => card.id));
		const packQuestKinds = new Map(input.quests.filter((record) => record.packId !== undefined).map((record) => [record.quest.id, record.quest.kind]));
		const allQuestKinds = new Map(input.quests.map((record) => [record.quest.id, record.quest.kind]));
		const patternsByQuest = new Map(input.quests.map((record) => [record.quest.id, new Set(record.quest.patterns)]));

		for (const { quest, file, packId } of input.quests)
		{
			// A pack quest may only depend on pack quests; an example may depend on examples or pack quests.
			const reachableKinds = packId === undefined ? allQuestKinds : packQuestKinds;

			for (const term of quest.terms)
			{
				if (!glossaryIds.has(term)) problems.push(errorAt(file, `terms: "${term}" is not a glossary id`, "front matter"));
			}

			for (const pattern of quest.patterns)
			{
				if (!patternIds.has(pattern)) problems.push(errorAt(file, `patterns: "${pattern}" is not a pattern card id`, "front matter"));
			}

			for (const prerequisite of quest.prerequisites)
			{
				if (prerequisite === quest.id) problems.push(errorAt(file, "prerequisites: a quest cannot require itself", "front matter"));
				else if (!reachableKinds.has(prerequisite)) problems.push(errorAt(file, `prerequisites: "${prerequisite}" is not a quest id`, "front matter"));
			}

			if (quest.kind !== "boss") continue;

			for (const piece of quest.pieces)
			{
				const kind = reachableKinds.get(piece);

				if (kind === undefined) problems.push(errorAt(file, `pieces: "${piece}" is not a quest id`, "front matter"));
				else if (kind !== "build") problems.push(errorAt(file, `pieces: "${piece}" is a ${kind} quest; boss pieces are build quests`, "front matter"));
			}
		}

		for (const card of input.content.patterns)
		{
			for (const questId of card.useCaseQuestIds)
			{
				const section = `pattern ${card.id}`;

				if (!packQuestKinds.has(questId)) problems.push(errorAt("patterns.json", `useCaseQuestIds: "${questId}" is not a quest id`, section));
				else if (!patternsByQuest.get(questId)?.has(card.id)) problems.push(errorAt("patterns.json", `useCaseQuestIds: quest "${questId}" does not list "${card.id}" in its patterns`, section));
			}
		}

		for (const entry of input.content.glossary)
		{
			if (entry.firstQuestId !== undefined && !packQuestKinds.has(entry.firstQuestId))
			{
				problems.push(errorAt("glossary.json", `firstQuestId: "${entry.firstQuestId}" is not a quest id`, `entry ${entry.id}`));
			}
		}

		return problems;
	},
};
