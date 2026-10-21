// Retries a file operation that Windows refuses while another program (antivirus, indexer, backup) briefly holds the file.

/** Error codes Windows gives for a file that is briefly held open by another program. */
export const WINDOWS_LOCK_CODES = ["EPERM", "EACCES", "EBUSY"];

/** Waits between tries, in milliseconds: about 1.5 seconds in total. */
export const LOCK_RETRY_DELAYS_MS = [50, 100, 200, 400, 800];

/** How retries behave; tests pass a fake platform and an instant sleep. */
export interface RetryOptions
{
	/** The platform (`process.platform`). Only win32 retries. */
	platform: NodeJS.Platform;

	/** Waits the given milliseconds. */
	sleep: (milliseconds: number) => Promise<void>;
}

/** Returns the error code of a node:fs error, or undefined. */
export function errorCode(error: unknown): string | undefined
{
	if (typeof error !== "object" || error === null || !("code" in error)) return undefined;

	const code = (error as { code: unknown }).code;

	return typeof code === "string" ? code : undefined;
}

/** Runs `operation`; on Windows, a lock error is retried with short backoff before it is thrown. Other platforms and other errors throw at once. */
export async function retryWhileLocked<Result>(operation: () => Promise<Result>, options: RetryOptions): Promise<Result>
{
	for (let attempt = 0; ; attempt++)
	{
		try
		{
			return await operation();
		}
		catch (error)
		{
			const delay = LOCK_RETRY_DELAYS_MS[attempt];
			const retryable = options.platform === "win32" && WINDOWS_LOCK_CODES.includes(errorCode(error) ?? "");

			if (!retryable || delay === undefined) throw error;

			await options.sleep(delay);
		}
	}
}
