// Flags a parameter or local in a reference solution or a starter that hides a data member of its class: MSVC rejects it (C4458), clang on the Mac does not (A1170).
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import type { ContentProblem } from "../../../src/shared/types/content";
import type { ContentCheck, QuestRecord } from "../ContentCheck";
import { findShadowedMembers, type ShadowFinding, type SourceFile } from "../shadow/findShadowedMembers";
import { errorAt } from "./checkHelpers";

/** File extensions the scan reads in `tools/solutions/`. */
const CPP_EXTENSION = /\.(?:h|hpp|cpp|cc|inl)$/i;

/** Every C++ file under `folder` (sub-folders included), with its path relative to `folder` using forward slashes. Empty when the folder is missing. */
async function listCppFiles(folder: string, relative: string = ""): Promise<string[]>
{
	const entries = await readdir(join(folder, relative), { withFileTypes: true }).catch(() => []);
	const found: string[] = [];

	for (const entry of entries)
	{
		const path = relative === "" ? entry.name : `${relative}/${entry.name}`;

		if (entry.isDirectory()) found.push(...(await listCppFiles(folder, path)));
		else if (entry.isFile() && CPP_EXTENSION.test(entry.name)) found.push(path);
	}

	return found.sort();
}

/** Reads every C++ file under the solutions folder; the unit is the quest folder the file sits in. */
async function readSolutionSources(solutionsFolder: string): Promise<SourceFile[]>
{
	const paths = await listCppFiles(solutionsFolder);

	return Promise.all(paths.map(async (path) => ({ unit: `solutions/${path.split("/")[0] ?? ""}`, path: `solutions/${path}`, text: await readFile(join(solutionsFolder, path), "utf8").catch(() => "") })));
}

/** The starter files of every build and refactor quest; the unit is the quest. */
function readStarterSources(quests: readonly QuestRecord[]): SourceFile[]
{
	return quests.flatMap(({ quest }) =>
	{
		if (quest.kind !== "build" && quest.kind !== "refactor") return [];

		return quest.files.map((file) => ({ unit: `starter/${quest.id}`, path: `starter ${file.name}`, text: file.starter }));
	});
}

/** How to fix a finding: a parameter takes the Unreal `In` prefix, a local gets a name for what it holds. */
function advice(finding: ShadowFinding): string
{
	return finding.kind === "parameter" ? `rename it with the In prefix, for example In${finding.name.replace(/^b(?=[A-Z])/, "")}` : "rename it to say what it holds";
}

/** The error text for one finding, saying what to rename and how. */
function describe(finding: ShadowFinding): string
{
	const where = finding.className === finding.owner ? `member of ${finding.className}` : `member of ${finding.owner}, inherited by ${finding.className}`;

	return `${finding.path} line ${finding.line}: ${finding.kind} "${finding.name}" in ${finding.className}::${finding.functionName} hides a ${where}, which MSVC rejects as error C4458 (clang on the Mac does not warn); ${advice(finding)}`;
}

/** Scans the reference solutions and the starters for names that hide a class member (C4458). */
export const shadowedMemberCheck: ContentCheck = {
	name: "shadowed class members",
	async run(input)
	{
		const solutions = await readSolutionSources(input.solutionsFolder);
		const findings = findShadowedMembers([...solutions, ...readStarterSources(input.quests)]);
		const fileOfQuest = new Map(input.quests.map((record) => [record.quest.id, record.file]));
		const problems: ContentProblem[] = [];

		for (const finding of findings)
		{
			const questId = finding.unit.slice(finding.unit.indexOf("/") + 1);
			const file = fileOfQuest.get(questId);

			problems.push(file === undefined ? errorAt(finding.path, describe(finding)) : errorAt(file, describe(finding), "Files"));
		}

		return problems;
	},
};
