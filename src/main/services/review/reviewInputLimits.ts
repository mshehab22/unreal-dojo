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

/**
 * The shortest copy of `text` that the review formats into the same result, so a retried review reads what the first one read.
 * Without `trim` (test messages, which the review does not trim): the first character past the cut, so the mark still appears.
 * With `trim` (compiler output, which the review trims before cutting): the text is trimmed, and when it is longer than the cut, the first
 * `maximum` characters plus the first non-whitespace character after the cut. The copy then ends in a non-whitespace character, so trimming
 * it again removes nothing, not even whitespace right at or before the cut, and the mark still appears (A746). A trimmed text longer than
 * the cut always has such a character, because it ends in one.
 */
export function keepForReview(text: string, maximum: number, trim: boolean): string
{
	if (!trim) return text.slice(0, maximum + 1);

	const source = text.trim();
	if (source.length <= maximum) return source;

	const nextVisible = source.slice(maximum).match(/\S/)?.[0] ?? "";

	return source.slice(0, maximum) + nextVisible;
}
