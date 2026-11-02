// The build tools problems from the last toolchain check, each with a "Check again" button that runs the check again and refreshes the environment.
import type { ToolchainProblem } from "@shared/types/engine";

import { AppErrorView } from "@/components/AppErrorView";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoAction } from "@/data/useDojoAction";

/** Props for ToolchainProblemList. */
interface ToolchainProblemListProps
{
	readonly problems: readonly ToolchainProblem[];
}

/** Lists each toolchain problem in plain words. A returning learner has no other way to ask for a new check, so each carries "Check again". */
export function ToolchainProblemList({ problems }: ToolchainProblemListProps)
{
	const recheck = useDojoAction((client) => client.checkToolchain(), [QUERY_KEYS.environment]);

	/** Runs the check once at a time. */
	const checkAgain = (): void =>
	{
		if (!recheck.isPending) void recheck.run();
	};

	return (
		<>
			{problems.map((problem) => (
				<AppErrorView key={problem.error.message} error={problem.error} onRetry={checkAgain} retryLabel={recheck.isPending ? "Checking" : "Check again"} compact />
			))}
			{recheck.error && <AppErrorView error={recheck.error} onRetry={checkAgain} retryLabel="Check again" compact />}
		</>
	);
}
