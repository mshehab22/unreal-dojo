// The cuts the code review input makes to engine text, in one place, so the stored run of an attempt keeps exactly what a retried review needs to read the same text (A740, A744).

/** Longest compiler output sent to the model, in characters. The pipeline already filters it; this is a last guard. */
export const MAXIMUM_COMPILER_OUTPUT_LENGTH = 8000;

/** Longest test message sent to the model, in characters. */
export const MAXIMUM_TEST_MESSAGE_LENGTH = 1000;

/** What a cut adds, so the reviewer knows text is missing. */
export const CUT_OFF_MARK = "(cut off)";

/** Cuts text at `maximum` characters and adds the mark, or answers it unchanged when it fits. */
export function cutForReview(text: string, maximum: number, separator: string): string
{
	if (text.length <= maximum) return text;

	return `${text.slice(0, maximum)}${separator}${CUT_OFF_MARK}`;
}

/** The shortest copy of `text` that `cutForReview` turns into the same result: trimmed when asked, and one character past the cut, so the mark still appears. */
export function keepForReview(text: string, maximum: number, trim: boolean): string
{
	const source = trim ? text.trim() : text;

	return source.slice(0, maximum + 1);
}
