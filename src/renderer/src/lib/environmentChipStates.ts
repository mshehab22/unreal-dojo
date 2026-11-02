// What the engine and toolchain chips on the Title screen say, from the environment status. Pure, so it is unit tested.
import type { EnvironmentStatus } from "@shared/types/engine";

/** How a chip's dot is colored. */
export type ChipTone = "pass" | "warn" | "fail" | "neutral";

/** The words, color, and tooltip of one chip. */
export interface ChipState
{
	value: string;
	tone: ChipTone;
	title?: string;
}

/** The engine chip: the version when usable, Too old when the engine is older than the app supports, Missing when it is gone or unusable for another reason, Not set when none was chosen. */
export function engineChipState(status: Pick<EnvironmentStatus, "engine" | "engineProblem">): ChipState
{
	if (status.engineProblem)
	{
		const value = status.engineProblem.code === "engine-version-unsupported" ? "Too old" : "Missing";

		return { value, tone: "fail", title: `${status.engineProblem.message} ${status.engineProblem.suggestedAction}` };
	}

	if (status.engine) return { value: `UE ${status.engine.version}`, tone: "pass", title: status.engine.path };

	return { value: "Not set", tone: "fail" };
}

/** The toolchain chip, or null when no check has run yet so there is nothing to say: Blocked when a problem stops builds, Warning for a smaller one, OK when fine. */
export function toolchainChipState(toolchain: EnvironmentStatus["toolchain"]): ChipState | null
{
	if (!toolchain) return null;

	const blocking = toolchain.problems.find((problem) => problem.blocksBuild);

	if (blocking) return { value: "Blocked", tone: "fail", title: `${blocking.error.message} ${blocking.error.suggestedAction}` };

	const smaller = toolchain.problems[0];

	if (smaller) return { value: "Warning", tone: "warn", title: `${smaller.error.message} ${smaller.error.suggestedAction}` };

	return { value: "OK", tone: "pass", title: toolchain.message };
}
