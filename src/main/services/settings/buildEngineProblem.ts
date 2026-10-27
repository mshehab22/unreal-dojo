// Turns the reason the engine in settings cannot be used into one plain AppError that names the folder and says what to do.
import type { AppError } from "@shared/types/errors";

import { AppErrorException } from "../../errors/AppErrorException";

/** Keeps a too-old engine's own error (it names the version); any other failure becomes "not found at <path>". */
export function buildEngineProblem(enginePath: string, failure: unknown): AppError
{
	if (failure instanceof AppErrorException && failure.appError.code === "engine-version-unsupported") return failure.appError;

	return {
		code: "engine-not-found",
		message: `Unreal Engine was not found at ${enginePath}. The folder may have been moved, renamed, or uninstalled.`,
		suggestedAction: "Pick your Unreal Engine folder again in Settings, or install Unreal Engine 5.8 from the Epic Games Launcher.",
		detail: failure instanceof Error ? failure.message : String(failure),
	};
}
