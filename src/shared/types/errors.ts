// The one error shape every DojoApi call can fail with. The renderer shows it in a single AppError component.

/** Every kind of failure the app knows how to explain. New codes are added here, never as free strings. */
export type AppErrorCode =
	| "not-implemented"
	| "invalid-payload"
	| "unexpected"
	| "ipc-failed"
	| "settings-invalid"
	| "secure-storage-unavailable"
	| "engine-not-found"
	| "engine-version-unsupported"
	| "toolchain-missing"
	| "build-environment-failed"
	| "sandbox-not-ready"
	| "sandbox-path-too-long"
	| "sandbox-path-unsupported"
	| "sandbox-copy-failed"
	| "editor-launch-failed"
	| "run-not-found"
	| "run-already-exists"
	| "run-cancelled"
	| "review-unavailable"
	| "review-invalid-output"
	| "review-refused"
	| "review-timeout"
	| "attempt-not-found"
	| "alternative-locked"
	| "content-invalid"
	| "quest-not-found"
	| "world-not-found"
	| "quest-locked"
	| "save-failed";

/** A failure explained in plain English, with what the learner can do about it. Plain data so it survives IPC and the context bridge. */
export interface AppError
{
	/** Machine-readable kind of failure. */
	code: AppErrorCode;

	/** What went wrong, in one or two plain-English sentences. */
	message: string;

	/** What the learner can do next, for example "Pick the engine folder again in Settings." */
	suggestedAction: string;

	/** Technical detail (an exception message, a file path) for the "show details" toggle. Never shown by default. */
	detail?: string;
}

/** Tells whether any value is an AppError, for the renderer's catch blocks. */
export function isAppError(value: unknown): value is AppError
{
	if (typeof value !== "object" || value === null) return false;

	const candidate = value as Record<string, unknown>;

	return typeof candidate.code === "string" && typeof candidate.message === "string" && typeof candidate.suggestedAction === "string";
}
