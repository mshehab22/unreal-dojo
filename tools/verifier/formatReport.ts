// Turns verifier results into the plain text lines printed to the terminal.
import type { ContentProblem } from "../../src/shared/types/content";

import type { FileReport, VerifierResult } from "./runVerifier";

/** One problem as an indented line: its severity when it is a warning, where it is, then what is wrong. */
function formatProblem(problem: ContentProblem): string
{
	const where = [problem.line === undefined ? undefined : `line ${problem.line}`, problem.section].filter((part) => part !== undefined).join(", ");
	const label = problem.severity === "warning" ? "warning: " : "";

	return where === "" ? `      ${label}${problem.message}` : `      ${label}${where}: ${problem.message}`;
}

/** `ok` for a clean file, `warn` when it has only warnings, `FAIL` when it has an error. */
function statusOf(report: FileReport): string
{
	if (report.problems.length === 0) return "ok  ";

	return report.problems.every((problem) => problem.severity === "warning") ? "warn" : "FAIL";
}

/** "3 problems" or "1 warning". */
function plural(count: number, word: string): string
{
	return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** Every report line, one per file plus one per problem, then a summary line. */
export function formatReport(result: VerifierResult): string[]
{
	const lines: string[] = [];

	for (const report of result.reports)
	{
		lines.push(`${statusOf(report)}  ${report.file}`);

		for (const problem of report.problems) lines.push(formatProblem(problem));
	}

	const { counts } = result;
	const parsed = `${counts.packs} packs, ${counts.worlds} worlds, ${counts.quests} quests, ${counts.examples} examples, ${counts.glossaryEntries} glossary entries, ${counts.patternCards} pattern cards`;
	const outcome = result.problemCount === 0 ? "no problems" : plural(result.problemCount, "problem");
	const warnings = result.warningCount === 0 ? "" : `, ${plural(result.warningCount, "warning")}`;

	lines.push("");
	lines.push(`Checked ${result.reports.length} files (${parsed}) in ${Math.round(result.elapsedMilliseconds)} ms: ${outcome}${warnings}.`);

	return lines;
}
