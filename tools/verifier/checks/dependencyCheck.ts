// Checks cross-quest code dependencies: every `Quests/<other-quest-id>/` a quest's code includes is declared in its brief (A268).
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import type { AuthoredQuest, ContentProblem } from "../../../src/shared/types/content";
import type { ContentCheck } from "../ContentCheck";
import { errorAt } from "./checkHelpers";

/** The fixed start of the brief line that names the earlier quests a quest compiles against (A268). */
const DECLARATION_PREFIX = "Compiles against earlier quests:";

/** Matches a quest folder path inside code or prose and captures the quest id. */
const QUEST_PATH_PATTERN = /Quests\/([a-z0-9]+(?:-[a-z0-9]+)*)\//g;

/** Quest ids named by `Quests/<id>/` paths in `text`. */
function questPathIds(text: string): Set<string>
{
	return new Set([...text.matchAll(QUEST_PATH_PATTERN)].map((match) => match[1] ?? ""));
}

/** The declaration line in a brief or spec, with markdown list and emphasis marks ignored, or undefined. */
function declarationLine(markdown: string): string | undefined
{
	return markdown.split("\n").map((line) => line.replace(/^[\s>*_-]+/, "")).find((line) => line.startsWith(DECLARATION_PREFIX));
}

/** The text of every reference solution file for a quest, or "" when there is no solution folder. */
async function solutionText(solutionsFolder: string, questId: string): Promise<string>
{
	const folder = join(solutionsFolder, questId);
	const names = await readdir(folder).catch(() => [] as string[]);
	const texts = await Promise.all(names.map((name) => readFile(join(folder, name), "utf8").catch(() => "")));

	return texts.join("\n");
}

/** The prose that carries the declaration, and the code that may include other quests' files. */
async function sourcesOf(quest: AuthoredQuest, solutionsFolder: string): Promise<{ prose: string; section: string; code: string } | undefined>
{
	if (quest.kind === "build" || quest.kind === "refactor")
	{
		const starters = quest.files.map((file) => file.starter).join("\n");

		return { prose: quest.brief, section: "Brief", code: `${starters}\n${quest.tests}\n${await solutionText(solutionsFolder, quest.id)}` };
	}

	if (quest.kind === "boss") return { prose: quest.spec, section: "Spec", code: "" };

	return undefined;
}

/**
 * For build, refactor, and boss quests: every other quest whose folder the starter, solution, or tests include must be
 * named on the brief's (or spec's) "Compiles against earlier quests:" line, and every quest named there must exist and
 * be one of the quest's prerequisites.
 */
export const dependencyCheck: ContentCheck = {
	name: "cross-quest dependencies",
	async run(input)
	{
		const problems: ContentProblem[] = [];
		const questIds = new Set(input.quests.map((record) => record.quest.id));

		for (const { quest, file } of input.quests)
		{
			const sources = await sourcesOf(quest, input.solutionsFolder);

			if (sources === undefined) continue;

			const line = declarationLine(sources.prose);
			const declared = line === undefined ? new Set<string>() : questPathIds(line);
			const used = [...questPathIds(sources.code)].filter((id) => id !== quest.id).sort();

			for (const id of used)
			{
				if (!declared.has(id)) problems.push(errorAt(file, `the code includes Quests/${id}/ but the "${DECLARATION_PREFIX}" line does not name it with its path`, sources.section));
			}

			for (const id of [...declared].sort())
			{
				if (!questIds.has(id)) problems.push(errorAt(file, `"${DECLARATION_PREFIX}" names "${id}", which is not a quest id`, sources.section));
				else if (!quest.prerequisites.includes(id)) problems.push(errorAt(file, `"${DECLARATION_PREFIX}" names "${id}", which must also be in prerequisites`, sources.section));
			}
		}

		return problems;
	},
};
