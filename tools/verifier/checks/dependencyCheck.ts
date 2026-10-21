// Checks cross-quest code dependencies: every other quest's file a quest's code includes, by path or by bare name, is declared in its brief (A268).
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import type { AuthoredQuest, ContentProblem } from "../../../src/shared/types/content";
import { readBossSolution } from "../bossSolution";
import type { ContentCheck, QuestRecord } from "../ContentCheck";
import { errorAt } from "./checkHelpers";

/** The fixed start of the brief line that names the earlier quests a quest compiles against (A268). */
const DECLARATION_PREFIX = "Compiles against earlier quests:";

/** Matches a quest folder path inside code or prose and captures the quest id. */
const QUEST_PATH_PATTERN = /Quests\/([a-z0-9]+(?:-[a-z0-9]+)*)\//g;

/** Matches an include of a bare file name (no folder), such as `#include "DojoF1TrainingDummy.h"`, and captures the name. */
const BARE_INCLUDE_PATTERN = /#include\s+"([^"/\\]+)"/g;

/** Quest ids named by `Quests/<id>/` paths in `text`. */
function questPathIds(text: string): Set<string>
{
	return new Set([...text.matchAll(QUEST_PATH_PATTERN)].map((match) => match[1] ?? ""));
}

/** Other quests whose files `code` includes by bare name, found through `fileOwners` (a file name to the quest whose folder holds it). */
function bareIncludeIds(code: string, ownId: string, fileOwners: ReadonlyMap<string, string>): Map<string, string>
{
	const found = new Map<string, string>();

	for (const match of code.matchAll(BARE_INCLUDE_PATTERN))
	{
		const name = match[1] ?? "";
		const owner = fileOwners.get(name);

		if (owner !== undefined && owner !== ownId && !found.has(owner)) found.set(owner, name);
	}

	return found;
}

/** The file names each quest places in its own `Quests/<id>/` folder: a code quest's files, or a boss's top-level integration code. */
async function questFileNames(record: QuestRecord, solutionsFolder: string): Promise<string[]>
{
	const quest = record.quest;

	if (quest.kind === "build" || quest.kind === "refactor") return quest.files.map((questFile) => questFile.name);
	if (quest.kind === "boss") return (await readBossSolution(solutionsFolder, quest.id))?.code.map((codeFile) => codeFile.name) ?? [];

	return [];
}

/**
 * Maps every quest file name to its quest, and reports a name two quests share: every quest folder is on the include
 * path (A181), so a bare include of that name would pick one of them silently.
 */
async function mapFileOwners(records: readonly QuestRecord[], solutionsFolder: string, problems: ContentProblem[]): Promise<Map<string, string>>
{
	const owners = new Map<string, string>();

	for (const record of records)
	{
		for (const name of await questFileNames(record, solutionsFolder))
		{
			const owner = owners.get(name);

			if (owner === undefined) owners.set(name, record.quest.id);
			else if (owner !== record.quest.id) problems.push(errorAt(record.file, `${name} is also a file of "${owner}"; every quest folder is on the include path (A181), so a bare #include "${name}" would be ambiguous. Rename one`, "Files"));
		}
	}

	return owners;
}

/** The declaration line in a brief or spec, with markdown list and emphasis marks ignored, or undefined. */
function declarationLine(markdown: string): string | undefined
{
	return markdown.split("\n").map((line) => line.replace(/^[\s>*_-]+/, "")).find((line) => line.startsWith(DECLARATION_PREFIX));
}

/** The quest ids a brief or spec names on its "Compiles against earlier quests:" line (by their `Quests/<id>/` paths). */
export function declaredDependencyIds(markdown: string): Set<string>
{
	const line = declarationLine(markdown);

	return line === undefined ? new Set() : questPathIds(line);
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

	if (quest.kind === "boss") return { prose: quest.spec, section: "Spec", code: await solutionText(solutionsFolder, quest.id) };

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
		const fileOwners = await mapFileOwners(input.quests, input.solutionsFolder, problems);

		for (const { quest, file } of input.quests)
		{
			const sources = await sourcesOf(quest, input.solutionsFolder);

			if (sources === undefined) continue;

			const declared = declaredDependencyIds(sources.prose);
			const used = [...questPathIds(sources.code)].filter((id) => id !== quest.id).sort();
			const bare = bareIncludeIds(sources.code, quest.id, fileOwners);

			for (const id of used)
			{
				if (!declared.has(id)) problems.push(errorAt(file, `the code includes Quests/${id}/ but the "${DECLARATION_PREFIX}" line does not name it with its path`, sources.section));
			}

			// A bare include of another quest's file compiles too (A181), so it is a dependency just the same.
			for (const [id, name] of [...bare].sort(([first], [second]) => first.localeCompare(second)))
			{
				if (!declared.has(id) && !used.includes(id)) problems.push(errorAt(file, `the code includes "${name}", a file of "${id}", but the "${DECLARATION_PREFIX}" line does not name ${id} with its path`, sources.section));
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
