// The panel under the Title chips that says in plain words what is wrong with the environment and what to do: the engine, the build tools, and the save file.
import type { EnvironmentStatus } from "@shared/types/engine";

import { AppErrorView } from "@/components/AppErrorView";
import { SaveNoticeView } from "@/components/SaveNoticeView";
import { ToolchainProblemList } from "@/components/ToolchainProblemList";
import { useNoticeDismissed } from "@/hooks/useNoticeDismissed";

/** Props for EnvironmentProblems. */
interface EnvironmentProblemsProps
{
	readonly status: EnvironmentStatus;
}

/** Lists each environment problem with its message and suggested action. Renders nothing when everything is fine or the only notice was dismissed. */
export function EnvironmentProblems({ status }: EnvironmentProblemsProps)
{
	const toolchainProblems = status.toolchain?.problems ?? [];
	const isSaveNoticeHidden = useNoticeDismissed(status.saveNotice);

	if (!status.engineProblem && toolchainProblems.length === 0 && isSaveNoticeHidden) return null;

	return (
		<div data-testid="environment-problems" className="flex max-w-2xl flex-col gap-2">
			{status.engineProblem && <AppErrorView error={status.engineProblem} compact />}
			<ToolchainProblemList problems={toolchainProblems} />
			<SaveNoticeView notice={status.saveNotice} compact />
		</div>
	);
}
