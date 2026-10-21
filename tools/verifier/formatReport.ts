// Turns verifier results into the plain text lines printed to the terminal.
import type { ContentProblem } from "../../src/shared/types/content";

import type { VerifierResult } from "./runVerifier";

/** One problem as an indented line: where it is, then what is wrong. */
function formatProblem(problem: ContentProblem): string
{
	const where = [problem.line === undefined ? undefined : `line ${problem.line}`, problem.section].filter((part) => part !== undefined).join(", ");

	return where === "" ? `      ${problem.message}` : `      ${where}: ${problem.message}`;
}

/** Every report line, one per file plus one per problem, then a summary line. */
export function formatReport(result: VerifierResult): string[]
{
	const lines: string[] = [];

	for (const report of result.reports)
	{
		lines.push(`${report.problems.length === 0 ? "ok  " : "FAIL"}  ${report.file}`);

		for (const problem of report.problems) lines.push(formatProblem(problem));
	}

	const { counts } = result;
	const parsed = `${counts.packs} packs, ${counts.worlds} worlds, ${counts.quests} quests, ${counts.examples} examples, ${counts.glossaryEntries} glossary entries, ${counts.patternCards} pattern cards`;
	const outcome = result.problemCount === 0 ? "no problems" : `${result.problemCount} problem${result.problemCount === 1 ? "" : "s"}`;

	lines.push("");
	lines.push(`Parsed ${result.reports.length} files (${parsed}) in ${Math.round(result.elapsedMilliseconds)} ms: ${outcome}.`);

	return lines;
}
