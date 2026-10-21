// Runs the verifier: parse every file, run the registered checks, and group the problems per file.
import type { ContentProblem } from "../../src/shared/types/content";
import { ContentLoader } from "../../src/main/services/content/ContentLoader";

import type { ContentCheck } from "./ContentCheck";
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
	problemCount: number;
	counts: VerifierCounts;
	elapsedMilliseconds: number;
}

/** Parse-only mode registers no extra checks; M1.8 adds fade, reachability, and coverage checks to this list. */
export const PARSE_ONLY_CHECKS: readonly ContentCheck[] = [];

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

/** Loads the content folder and the examples, runs `checks`, and returns per-file reports filtered by `--quest`. */
export async function runVerifier(options: VerifierOptions, checks: readonly ContentCheck[] = PARSE_ONLY_CHECKS): Promise<VerifierResult>
{
	const started = performance.now();
	const loader = new ContentLoader(options.contentFolder);
	const loadOptions = options.packId === undefined ? {} : { packId: options.packId };
	const [content, examples] = await Promise.all([loader.load(loadOptions), loader.loadExamples()]);
	const input = { content, examples: examples.quests };
	const problems = [...content.problems, ...examples.problems, ...checks.flatMap((check) => check.run(input))];
	let reports = groupByFile([...content.files, ...examples.files], problems);

	if (options.questId !== undefined)
	{
		const questFile = content.questSources[options.questId];

		reports = questFile === undefined
			? [{ file: "(none)", problems: [{ file: "(none)", message: `no quest with id "${options.questId}" parsed; run without --quest to see every problem` }] }]
			: reports.filter((report) => report.file === questFile);
	}

	const counts: VerifierCounts = {
		packs: content.packs.length,
		worlds: content.packs.reduce((total, pack) => total + pack.worlds.length, 0),
		quests: Object.keys(content.questSources).length,
		examples: examples.quests.length,
		glossaryEntries: content.glossary.length,
		patternCards: content.patterns.length,
	};

	return {
		reports,
		problemCount: reports.reduce((total, report) => total + report.problems.length, 0),
		counts,
		elapsedMilliseconds: performance.now() - started,
	};
}
