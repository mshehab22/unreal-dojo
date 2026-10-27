// Which AppError codes mean "the problem is the machine or the engine, not the learner's code", for the headline over a rejected Run or Submit.
import type { AppErrorCode } from "@shared/types/errors";

/** The headline over a failure that is not the learner's code. */
export const NOT_YOUR_CODE_HEADLINE = "Not your code";

/** Codes a Run or Submit can fail with when the engine, the toolchain, or the sandbox is at fault. */
const OUTSIDE_FAILURE_CODES: ReadonlySet<AppErrorCode> = new Set<AppErrorCode>([
	"build-environment-failed",
	"toolchain-missing",
	"engine-not-found",
	"engine-version-unsupported",
	"sandbox-not-ready",
	"sandbox-path-too-long",
	"sandbox-path-unsupported",
	"sandbox-copy-failed",
	"editor-launch-failed",
	"save-failed",
]);

/** True when a rejected Run or Submit with this code is not the learner's doing. */
export function isOutsideFailureCode(code: AppErrorCode): boolean
{
	return OUTSIDE_FAILURE_CODES.has(code);
}
