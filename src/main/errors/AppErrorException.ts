// The exception main-process services throw when they want the renderer to see a specific AppError.
import type { AppError, AppErrorCode } from "@shared/types/errors";

/** Carries an AppError through a `throw` so the IPC wrapper can send it to the renderer unchanged, with a real stack trace in the main log. */
export class AppErrorException extends Error
{
	/** The error the renderer will receive. */
	readonly appError: AppError;

	/** Builds the exception from the parts of an AppError. */
	constructor(code: AppErrorCode, message: string, suggestedAction: string, detail?: string)
	{
		super(detail ? `${message} (${detail})` : message);

		this.name = "AppErrorException";
		this.appError = detail === undefined ? { code, message, suggestedAction } : { code, message, suggestedAction, detail };
	}
}
