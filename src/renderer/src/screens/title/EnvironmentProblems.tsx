// The panel under the Title chips that says in plain words what is wrong with the environment and what to do: the engine, the build tools, and the save file.
import type { EnvironmentStatus } from "@shared/types/engine";

import { AppErrorView } from "@/components/AppErrorView";
import { SaveNoticeView } from "@/components/SaveNoticeView";

/** Props for EnvironmentProblems. */
interface EnvironmentProblemsProps
{
	readonly status: EnvironmentStatus;
}

/** Lists each environment problem with its message and suggested action. Renders nothing when everything is fine. */
export function EnvironmentProblems({ status }: EnvironmentProblemsProps)
{
	const toolchainProblems = status.toolchain?.problems ?? [];

	if (!status.engineProblem && toolchainProblems.length === 0 && !status.saveNotice) return null;

	return (
		<div data-testid="environment-problems" className="flex max-w-2xl flex-col gap-2">
			{status.engineProblem && <AppErrorView error={status.engineProblem} compact />}
			{toolchainProblems.map((problem) => (
				<AppErrorView key={problem.error.message} error={problem.error} compact />
			))}
			<SaveNoticeView notice={status.saveNotice} compact />
		</div>
	);
}
