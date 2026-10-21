// Runs a zod schema and turns every issue into a content problem with a readable field path and plain-words message.
import { z } from "zod";

import type { ProblemList, ProblemLocation } from "../ProblemList";

/** How each zod type name reads in a message. */
const TYPE_NOUNS: Readonly<Record<string, string>> = {
	string: "text",
	number: "a number",
	int: "a whole number",
	array: "a list",
	object: "an object with named fields",
	boolean: "true or false",
};

/** Describes an allowed-values list, quoting each value. */
function allowedValues(values: readonly unknown[]): string
{
	return values.map((value) => String(value)).join(", ");
}

/** The plain-words message for one raw issue; undefined keeps zod's own (used for refinement messages). */
function plainMessage(issue: z.core.$ZodRawIssue): string | undefined
{
	switch (issue.code)
	{
		case "invalid_type":
		{
			const noun = TYPE_NOUNS[issue.expected] ?? issue.expected;
			return issue.input === undefined ? `missing (expected ${noun})` : `expected ${noun}`;
		}

		case "invalid_value":
		{
			const allowed = `expected one of: ${allowedValues(issue.values)}`;
			return issue.input === undefined ? `missing (${allowed})` : `"${String(issue.input)}" is not allowed (${allowed})`;
		}

		case "invalid_union":
		{
			// A discriminated union with an unknown `type` or `kind`: name the bad value and the allowed ones.
			if (issue.discriminator === undefined || !Array.isArray(issue.options)) return undefined;

			const input = issue.input as Record<string, unknown> | undefined;
			const value = input?.[issue.discriminator];
			const allowed = `expected one of: ${allowedValues(issue.options)}`;

			return value === undefined ? `missing (${allowed})` : `"${String(value)}" is not allowed (${allowed})`;
		}

		case "too_small":
			if (issue.origin === "array") return Number(issue.minimum) === 1 ? "expected at least one entry" : `expected at least ${issue.minimum} entries`;
			if (issue.origin === "string") return "expected non-empty text";
			return `expected ${issue.minimum} or more`;

		case "too_big":
			return issue.origin === "array" ? `expected at most ${issue.maximum} entries` : `expected at most ${issue.maximum}`;

		case "unrecognized_keys":
			return "unknown field";

		default:
			return undefined;
	}
}

/** Joins a zod path into `Questions[2].answerIndex` form, after an optional prefix. */
function formatPath(prefix: string, path: readonly PropertyKey[]): string
{
	let joined = prefix;

	for (const segment of path)
	{
		if (typeof segment === "number") joined += `[${segment}]`;
		else joined += joined === "" ? String(segment) : `.${String(segment)}`;
	}

	return joined;
}

/**
 * Validates `data` against `schema`. On success returns the typed value; on failure adds one problem per issue
 * (one per unknown field) and returns undefined. `pathPrefix` names where the data sits, such as "Questions".
 */
export function validateWith<Output>(schema: z.ZodType<Output>, data: unknown, problems: ProblemList, location: ProblemLocation, pathPrefix: string = ""): Output | undefined
{
	const result = schema.safeParse(data, { error: plainMessage });

	if (result.success) return result.data;

	for (const issue of result.error.issues)
	{
		if (issue.code === "unrecognized_keys")
		{
			for (const key of issue.keys) problems.add(`${formatPath(pathPrefix, [...issue.path, key])}: unknown field`, location);
			continue;
		}

		const path = formatPath(pathPrefix, issue.path);

		problems.add(path === "" ? issue.message : `${path}: ${issue.message}`, location);
	}

	return undefined;
}
