// Maps a sandbox build's status to how its progress view should look.
import type { BuildOutcome } from "@/components/BuildProgressView";
import type { SandboxBuildStatus } from "@/data/useSandboxBuild";

/** The progress view's outcome for a status; idle and errored never show the view, so they read as running. */
export function buildOutcome(status: SandboxBuildStatus): BuildOutcome
{
	if (status === "succeeded" || status === "failed" || status === "cancelled") return status;

	return "running";
}
