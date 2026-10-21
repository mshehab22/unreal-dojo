// Checks that every build and refactor quest ships a reference solution with exactly the quest's file names, and every boss an integration.
import { readdir } from "node:fs/promises";
import { join } from "node:path";

import type { ContentProblem } from "../../../src/shared/types/content";
import { BOSS_TEST_SUFFIX, readBossSolution } from "../bossSolution";
import type { ContentCheck, QuestRecord } from "../ContentCheck";
import { errorAt, warningAt } from "./checkHelpers";

/**
 * A boss with no integration folder is a warning while the first boss integrations are being written, and becomes an
 * error once the Pack 1 World 1 boss has one (A215). A folder that exists but has no code or no tests is always an error.
 */
const MISSING_BOSS_INTEGRATION_IS_ERROR = false;

/** Problems with one boss's reference integration in `tools/solutions/<boss-id>/` (A67). */
async function checkBossIntegration({ quest, file }: QuestRecord, solutionsFolder: string, questsById: ReadonlyMap<string, QuestRecord["quest"]>): Promise<ContentProblem[]>
{
	const folder = `solutions/${quest.id}/`;
	const integration = await readBossSolution(solutionsFolder, quest.id);

	if (integration === undefined)
	{
		const message = `no reference integration: add ${folder} with the integration's .h and .cpp files and a ${BOSS_TEST_SUFFIX} that plays two rounds (A67)`;

		return [MISSING_BOSS_INTEGRATION_IS_ERROR ? errorAt(file, message, "Spec") : warningAt(file, message, "Spec")];
	}

	const problems: ContentProblem[] = [];

	if (integration.code.length === 0) problems.push(errorAt(file, `${folder} has no .h or .cpp integration code`, "Spec"));
	if (integration.tests.length === 0) problems.push(errorAt(file, `${folder} has no ${BOSS_TEST_SUFFIX} automation tests`, "Spec"));

	for (const name of integration.otherNames) problems.push(errorAt(file, `${folder}${name} is not a .h or .cpp file`, "Spec"));

	// A subfolder holds extended files of one piece quest and replaces them when the boss is built (A215).
	for (const [pieceId, files] of integration.overrides)
	{
		const piece = questsById.get(pieceId);

		if (quest.kind !== "boss" || !quest.pieces.includes(pieceId) || piece === undefined || piece.kind !== "build")
		{
			problems.push(errorAt(file, `${folder}${pieceId}/ is not named after one of this boss's pieces`, "Spec"));
			continue;
		}

		const pieceFiles = new Set(piece.files.map((pieceFile) => pieceFile.name));

		for (const override of files)
		{
			if (!pieceFiles.has(override.name)) problems.push(errorAt(file, `${folder}${pieceId}/${override.name} is not one of ${pieceId}'s files`, "Spec"));
		}
	}

	return problems;
}

/** Lists the files in a folder, or undefined when the folder does not exist. */
async function listFiles(folder: string): Promise<string[] | undefined>
{
	const entries = await readdir(folder, { withFileTypes: true }).catch(() => undefined);

	return entries?.filter((entry) => entry.isFile() && !entry.name.startsWith(".")).map((entry) => entry.name);
}

/** `tools/solutions/<quest-id>/` holds one file per starter file, with the same names, and nothing else; bosses hold an integration with tests. */
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

		const questsById = new Map(input.quests.map((record) => [record.quest.id, record.quest]));

		for (const record of input.quests.filter((entry) => entry.quest.kind === "boss")) problems.push(...(await checkBossIntegration(record, input.solutionsFolder, questsById)));

		return problems;
	},
};
