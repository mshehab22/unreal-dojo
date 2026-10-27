// Builds the one-time notice about the save file from a refused save or from how the load recovered.
import type { AppError } from "@shared/types/errors";

import type { LoadRecoveryReport } from "../progress/ProgressStore";

/** A refused save wins (it is the more serious); then a restore from the backup; then a fresh start. Null when the save loaded cleanly. */
export function buildSaveNotice(refusal: AppError | null, recovery: LoadRecoveryReport): AppError | null
{
	if (refusal) return refusal;

	const keptFile = recovery.quarantinedPath === undefined ? {} : { detail: `The damaged file was kept at ${recovery.quarantinedPath}` };

	if (recovery.kind === "backup")
	{
		return {
			code: "save-failed",
			message: "Your progress file was damaged, so Unreal Dojo restored it from the last backup. A few of your most recent steps may be missing.",
			suggestedAction: "Keep playing. Your progress is being saved normally again.",
			...keptFile,
		};
	}

	if (recovery.kind === "fresh")
	{
		return {
			code: "save-failed",
			message: "Your progress file and its backup were both damaged, so Unreal Dojo started a new save.",
			suggestedAction: "If you want the old progress back, the damaged file was kept next to the new one. Ask for help and send it along.",
			...keptFile,
		};
	}

	return null;
}
