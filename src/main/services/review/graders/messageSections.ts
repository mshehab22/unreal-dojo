// Builds the tagged sections of a grader's user message: learner files with line numbers, test results, breakdown plans.
import type { BreakdownPlan } from "@shared/types/progress";
import type { RunResult } from "@shared/types/run";

/** Longest compiler output sent to the model, in characters. The pipeline already filters it; this is a last guard. */
const MAXIMUM_COMPILER_OUTPUT_LENGTH = 8000;

/** Breaks any closing tag inside learner text (`</file>` becomes `< /file>`), so a file cannot end its own section early. Code stays readable. */
export function neutralizeClosingTags(text: string): string
{
	return text.replace(/<\//g, "< /");
}

/** Wraps text in one tag, for example `<brief>...</brief>`, neutralizing closing tags inside it. */
export function tagged(tag: string, text: string): string
{
	return `<${tag}>\n${neutralizeClosingTags(text.trim())}\n</${tag}>`;
}

/** Numbers a list of lines from 1, one per line. */
export function numberedList(lines: readonly string[]): string
{
	if (lines.length === 0) return "(none)";

	return lines.map((line, index) => `${index + 1}. ${line}`).join("\n");
}

/** Prefixes every line of a file with its line number, so the model can cite lines. */
export function withLineNumbers(content: string): string
{
	const lines = content.replace(/\r\n/g, "\n").split("\n");
	const width = String(lines.length).length;

	return lines.map((line, index) => `${String(index + 1).padStart(width, " ")} | ${line}`).join("\n");
}

/** Every learner file as a `<file name="...">` block with line numbers, sorted by name so the message is stable. */
export function fileSections(files: Record<string, string>): string
{
	const names = Object.keys(files).sort();
	if (names.length === 0) return "(no files)";

	return names.map((name) => `<file name="${name.replace(/[<>"]/g, "")}">\n${neutralizeClosingTags(withLineNumbers(files[name] ?? ""))}\n</file>`).join("\n\n");
}

/** The engine's verdict as plain lines: build, pass count, and each test with its message. */
export function testResultLines(run: RunResult): string
{
	const header = [`Compiled: ${run.compiled ? "yes" : "no"}`, `Tests passed: ${run.testsPassed} of ${run.testsTotal}`];
	const tests = run.tests.map((test) => `- ${test.passed ? "PASS" : "FAIL"} ${test.name}${test.message ? `: ${test.message}` : ""}`);

	return [...header, ...tests].join("\n");
}

/** The filtered compiler output, cut to a safe length. */
export function compilerOutputText(run: RunResult): string
{
	const output = run.compilerOutput.trim();
	if (output.length === 0) return "(no warnings)";
	if (output.length <= MAXIMUM_COMPILER_OUTPUT_LENGTH) return output;

	return `${output.slice(0, MAXIMUM_COMPILER_OUTPUT_LENGTH)}\n(cut off)`;
}

/** A breakdown plan as readable lines: pieces with kind, label, and purpose, then arrows by label. */
export function planText(plan: BreakdownPlan): string
{
	const labelsById = new Map(plan.pieces.map((piece) => [piece.id, piece.label]));
	const pieces = plan.pieces.map((piece) => `- [${piece.kind}] ${piece.label}${piece.purpose ? `: ${piece.purpose}` : ""}`);
	const edges = plan.edges.map((edge) => `- ${labelsById.get(edge.from) ?? edge.from} ${edge.kind} ${labelsById.get(edge.to) ?? edge.to}`);

	return [`Pieces:`, ...(pieces.length > 0 ? pieces : ["(none)"]), `Arrows:`, ...(edges.length > 0 ? edges : ["(none)"])].join("\n");
}
