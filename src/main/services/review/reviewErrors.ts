// The AppErrors the review service throws, written once so every provider and grader explains a failure the same way.
import { AppErrorException } from "../../errors/AppErrorException";

/** Longest piece of model output kept in an error's detail, so a huge reply does not flood the log. */
const MAXIMUM_DETAIL_LENGTH = 2000;

/** Shortens text for an error's detail field. */
export function trimForDetail(text: string): string
{
	if (text.length <= MAXIMUM_DETAIL_LENGTH) return text;

	return `${text.slice(0, MAXIMUM_DETAIL_LENGTH)}... (${text.length - MAXIMUM_DETAIL_LENGTH} more characters)`;
}

/** The reviewer answered, but not with JSON the grader can use. */
export function invalidOutputError(graderName: string, problem: string, rawOutput: string): AppErrorException
{
	return new AppErrorException(
		"review-invalid-output",
		`The ${graderName} answered in a shape the app could not read: ${problem}`,
		"Submit again. If it keeps happening, switch the review provider in Settings.",
		trimForDetail(rawOutput),
	);
}

/** The model declined to answer. */
export function refusedError(providerName: string, detail?: string): AppErrorException
{
	return new AppErrorException(
		"review-refused",
		`${providerName} declined to review this submission.`,
		"Submit again. If it keeps happening, switch the review provider in Settings; your tests still count.",
		detail,
	);
}

/** The provider cannot take a review right now. */
export function unavailableError(message: string, suggestedAction: string, detail?: string): AppErrorException
{
	return new AppErrorException("review-unavailable", message, suggestedAction, detail === undefined ? undefined : trimForDetail(detail));
}

/** The provider took too long. Kept apart from review-unavailable so a slow Claude Code never moves a review to the paid API on its own (A300). */
export function timeoutError(message: string): AppErrorException
{
	return new AppErrorException("review-timeout", message, "Press Retry review to ask again, or submit again later. Your tests still count.");
}

/** The learner cancelled while the review was running. */
export function cancelledError(): AppErrorException
{
	return new AppErrorException("run-cancelled", "The review was cancelled.", "Submit again when you are ready.");
}
