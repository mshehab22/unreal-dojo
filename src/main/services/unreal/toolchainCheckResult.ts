// Builds a ToolchainCheck from the problems a platform checker found, so both checkers summarize the same way.
import type { ToolchainCheck, ToolchainProblem } from "@shared/types/engine";

/** Sorts blocking problems first and sets `ok`. The message is the first blocking problem's, or the healthy message followed by any non-blocking problem's. */
export function toolchainCheckResult(tool: ToolchainCheck["tool"], healthyMessage: string, toolVersion: string | undefined, problems: ToolchainProblem[]): ToolchainCheck
{
	const sortedProblems = [...problems].sort((left, right) => Number(right.blocksBuild) - Number(left.blocksBuild));
	const firstProblem = sortedProblems[0];
	const ok = !sortedProblems.some((problem) => problem.blocksBuild);

	const message = ok ? [healthyMessage, ...sortedProblems.map((problem) => problem.error.message)].join(" ") : (firstProblem?.error.message ?? healthyMessage);
	const result: ToolchainCheck = { ok, tool, message, problems: sortedProblems };

	if (toolVersion !== undefined) result.toolVersion = toolVersion;
	if (firstProblem) result.suggestedAction = firstProblem.error.suggestedAction;

	return result;
}
