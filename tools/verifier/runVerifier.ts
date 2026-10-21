// Runs the verifier: parse every file, run the content checks, and group the problems per file.
import type { ContentProblem, LoadedContent } from "../../src/shared/types/content";
import { ContentLoader } from "../../src/main/services/content/ContentLoader";

import type { ContentCheck, QuestRecord, VerifierInput } from "./ContentCheck";
import { coverageCheck } from "./checks/coverageCheck";
import { dependencyCheck } from "./checks/dependencyCheck";
import { fadeLadderCheck } from "./checks/fadeLadderCheck";
import { packGateCheck } from "./checks/packGateCheck";
import { glossaryCheck } from "./checks/glossaryCheck";
import { planCoverageCheck } from "./checks/planCoverageCheck";
import { questionCheck } from "./checks/questionCheck";
import { questShapeCheck } from "./checks/questShapeCheck";
import { referenceCheck } from "./checks/referenceCheck";
import { repetitionCheck } from "./checks/repetitionCheck";
import { solutionCheck } from "./checks/solutionCheck";
import { termOrderCheck } from "./checks/termOrderCheck";
import { unlockGraphCheck } from "./checks/unlockGraphCheck";
import type { VerifierOptions } from "./parseVerifierArguments";

/** The outcome for one file: its path and every problem in it (empty means it passed). */
export interface FileReport
{
	file: string;
	problems: ContentProblem[];
}

/** Counts shown in the summary line. */
export interface VerifierCounts
{
	packs: number;
	worlds: number;
	quests: number;
	examples: number;
	glossaryEntries: number;
	patternCards: number;
}

/** Everything the verifier found. */
export interface VerifierResult
{
	reports: FileReport[];

	/** Errors only; these fail the run. */
	problemCount: number;

	warningCount: number;
	counts: VerifierCounts;
	elapsedMilliseconds: number;

	/** What the content checks read, kept so the engine stage can reuse it. */
	input: VerifierInput;
}

/** Every content check, in report order. The engine stage (`--engine`) runs separately after these. */
export const CONTENT_CHECKS: readonly ContentCheck[] = [
	questShapeCheck,
	referenceCheck,
	unlockGraphCheck,
	fadeLadderCheck,
	repetitionCheck,
	planCoverageCheck,
	questionCheck,
	glossaryCheck,
	coverageCheck,
	solutionCheck,
	dependencyCheck,
	packGateCheck,
	termOrderCheck,
];

/** Lists every pack quest with its file, pack, and world position, then every example. */
function questRecords(content: LoadedContent, examples: { quests: VerifierInput["examples"]; questSources: Record<string, string> }): QuestRecord[]
{
	const records: QuestRecord[] = [];

	for (const pack of content.packs)
	{
		pack.worlds.forEach((world, worldIndex) =>
		{
			for (const quest of world.quests) records.push({ quest, file: content.questSources[quest.id] ?? `packs/${pack.id}`, packId: pack.id, worldIndex });
		});
	}

	for (const quest of examples.quests) records.push({ quest, file: examples.questSources[quest.id] ?? "examples" });

	return records;
}

/** Groups problems under their file, keeping every read file (even clean ones) so the report lists each one. */
function groupByFile(files: readonly string[], problems: readonly ContentProblem[]): FileReport[]
{
	const reports = new Map<string, FileReport>();

	for (const file of files) reports.set(file, { file, problems: [] });

	for (const problem of problems)
	{
		const report = reports.get(problem.file) ?? { file: problem.file, problems: [] };

		report.problems.push(problem);
		reports.set(problem.file, report);
	}

	return [...reports.values()].sort((first, second) => first.file.localeCompare(second.file));
}

/**
 * Keeps the report of the file that defines `questId` plus every file whose problems quote that id, so a
 * duplicate id flagged on a second file still shows up. Says so when no file matches.
 */
function filterToQuest(reports: readonly FileReport[], questId: string, questFile: string | undefined): FileReport[]
{
	const quoted = `"${questId}"`;
	const kept = reports.filter((report) => report.file === questFile || report.problems.some((problem) => problem.message.includes(quoted)));

	if (kept.length > 0) return kept;

	return [{ file: "(none)", problems: [{ file: "(none)", message: `no quest with id "${questId}" parsed; run without --quest to see every problem` }] }];
}

/** Keeps only files inside `packs/<packId>/`, or says the pack does not exist. */
function filterToPack(reports: readonly FileReport[], packId: string): FileReport[]
{
	const prefix = `packs/${packId}/`;
	const kept = reports.filter((report) => report.file.startsWith(prefix));

	if (kept.length > 0) return kept;

	return [{ file: "packs", problems: [{ file: "packs", message: `no pack folder named "${packId}"` }] }];
}

/** Counts a report list's errors and warnings. */
function countProblems(reports: readonly FileReport[]): { errors: number; warnings: number }
{
	const all = reports.flatMap((report) => report.problems);
	const warnings = all.filter((problem) => problem.severity === "warning").length;

	return { errors: all.length - warnings, warnings };
}

/**
 * Loads the whole content folder and the examples, runs `checks`, and returns per-file reports. Every pack is always
 * read so cross-pack references and duplicate ids are checked; `--pack` and `--quest` only narrow what is reported (A206).
 */
export async function runVerifier(options: VerifierOptions, checks: readonly ContentCheck[] = CONTENT_CHECKS): Promise<VerifierResult>
{
	const started = performance.now();
	const loader = new ContentLoader(options.contentFolder);
	const [content, examples] = await Promise.all([loader.load(), loader.loadExamples()]);
	const input: VerifierInput = {
		content,
		examples: examples.quests,
		quests: questRecords(content, examples),
		solutionsFolder: options.solutionsFolder,
		release: options.release,
	};
	const checkProblems = (await Promise.all(checks.map((check) => check.run(input)))).flat();
	let reports = groupByFile([...content.files, ...examples.files], [...content.problems, ...examples.problems, ...checkProblems]);

	if (options.packId !== undefined) reports = filterToPack(reports, options.packId);
	if (options.questId !== undefined) reports = filterToQuest(reports, options.questId, content.questSources[options.questId] ?? examples.questSources[options.questId]);

	const { errors, warnings } = countProblems(reports);
	const counts: VerifierCounts = {
		packs: content.packs.length,
		worlds: content.packs.reduce((total, pack) => total + pack.worlds.length, 0),
		quests: Object.keys(content.questSources).length,
		examples: examples.quests.length,
		glossaryEntries: content.glossary.length,
		patternCards: content.patterns.length,
	};

	return { reports, problemCount: errors, warningCount: warnings, counts, elapsedMilliseconds: performance.now() - started, input };
}

/** Adds later problems (the engine stage) to a result: each lands under its file, and the counts are redone. */
export function addProblems(result: VerifierResult, problems: readonly ContentProblem[]): VerifierResult
{
	const reports = groupByFile([], [...result.reports.flatMap((report) => report.problems), ...problems]);

	for (const report of result.reports) if (!reports.some((existing) => existing.file === report.file)) reports.push({ file: report.file, problems: [] });

	reports.sort((first, second) => first.file.localeCompare(second.file));

	const { errors, warnings } = countProblems(reports);

	return { ...result, reports, problemCount: errors, warningCount: warnings };
}
