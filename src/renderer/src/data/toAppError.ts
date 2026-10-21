// Turns anything a DojoClient call rejected with into an AppError, so screens only ever show one error shape.
import { isAppError, type AppError } from "@shared/types/errors";

/** The AppError itself, or an `unexpected` one carrying the thrown value as detail. */
export function toAppError(thrown: unknown): AppError
{
	if (isAppError(thrown)) return thrown;

	return {
		code: "unexpected",
		message: "Something went wrong that the app did not expect.",
		suggestedAction: "Try again. If it keeps happening, restart Unreal Dojo.",
		detail: thrown instanceof Error ? thrown.message : String(thrown),
	};
}
