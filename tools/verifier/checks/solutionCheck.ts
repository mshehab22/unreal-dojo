// Checks that every build and refactor quest ships a reference solution with exactly the quest's file names.
import { readdir } from "node:fs/promises";
import { join } from "node:path";

import type { ContentProblem } from "../../../src/shared/types/content";
import type { ContentCheck } from "../ContentCheck";
import { errorAt } from "./checkHelpers";

/** Lists the files in a folder, or undefined when the folder does not exist. */
async function listFiles(folder: string): Promise<string[] | undefined>
{
	const entries = await readdir(folder, { withFileTypes: true }).catch(() => undefined);

	return entries?.filter((entry) => entry.isFile() && !entry.name.startsWith(".")).map((entry) => entry.name);
}

/** `tools/solutions/<quest-id>/` holds one file per starter file, with the same names, and nothing else. */
export const solutionCheck: ContentCheck = {
	name: "reference solutions",
	async run(input)
	{
		const problems: ContentProblem[] = [];
		const codeQuests = input.quests.filter((record) => record.quest.kind === "build" || record.quest.kind === "refactor");
		const listings = await Promise.all(codeQuests.map((record) => listFiles(join(input.solutionsFolder, record.quest.id))));

		codeQuests.forEach(({ quest, file }, index) =>
		{
			if (quest.kind !== "build" && quest.kind !== "refactor") return;

			const present = listings[index];
			const folder = `solutions/${quest.id}/`;

			if (present === undefined)
			{
				problems.push(errorAt(file, `no reference solution: add ${folder} with ${quest.files.map((questFile) => questFile.name).join(", ")}`, "Files"));
				return;
			}

			const expected = new Set(quest.files.map((questFile) => questFile.name));

			for (const name of expected) if (!present.includes(name)) problems.push(errorAt(file, `${folder} is missing ${name}`, "Files"));
			for (const name of present) if (!expected.has(name)) problems.push(errorAt(file, `${folder}${name} is not one of the quest's files`, "Files"));
		});

		return problems;
	},
};
