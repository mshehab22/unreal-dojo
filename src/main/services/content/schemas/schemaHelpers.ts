// Small zod building blocks shared by every content schema, each with a plain-words error message.
import { z } from "zod";

/** Non-empty text (at least one character that is not a space). */
export function text(): z.ZodString
{
	return z.string().regex(/\S/, { error: "expected non-empty text" });
}

/** A list of non-empty text; `minimum` 1 rejects an empty list. */
export function textList(minimum: number = 0): z.ZodArray<z.ZodString>
{
	return z.array(text()).min(minimum);
}

/** A whole number from `minimum` to `maximum` inclusive, with one message for every way it can be wrong. */
export function wholeNumber(minimum: number, maximum?: number): z.ZodInt
{
	const range = maximum === undefined ? `${minimum} or more` : `${minimum} to ${maximum}`;
	const error = (issue: { input?: unknown }): string => (issue.input === undefined ? `missing (expected a whole number, ${range})` : `expected a whole number, ${range}`);
	const schema = z.int({ error }).min(minimum, { error });

	return maximum === undefined ? schema : schema.max(maximum, { error });
}
