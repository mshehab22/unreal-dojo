// Turns raw model text into a typed grader answer, or a clear review-invalid-output AppError when it does not fit the schema.
import type { z } from "zod";

import { invalidOutputError } from "../reviewErrors";
import { extractJsonObject } from "./extractJsonObject";

/** Most schema problems named in the error message; the rest are in the detail. */
const MAXIMUM_LISTED_ISSUES = 3;

/** Describes zod issues in one short line, for example "score: Too big; summary: Required". */
function describeIssues(issues: readonly z.core.$ZodIssue[]): string
{
	const listed = issues.slice(0, MAXIMUM_LISTED_ISSUES).map((issue) =>
	{
		const path = issue.path.length > 0 ? issue.path.join(".") : "(top level)";

		return `${path}: ${issue.message}`;
	});

	const more = issues.length > MAXIMUM_LISTED_ISSUES ? ` and ${issues.length - MAXIMUM_LISTED_ISSUES} more` : "";

	return `${listed.join("; ")}${more}.`;
}

/** Extracts the JSON object from `rawOutput` and checks it against `schema`. Throws a review-invalid-output AppErrorException naming the grader on any problem. */
export function parseModelOutput<Output>(graderName: string, schema: z.ZodType<Output>, rawOutput: string): Output
{
	const extraction = extractJsonObject(rawOutput);
	if (!extraction.found) throw invalidOutputError(graderName, extraction.problem, rawOutput);

	const result = schema.safeParse(extraction.value);
	if (!result.success) throw invalidOutputError(graderName, `the JSON did not match the expected shape (${describeIssues(result.error.issues)})`, rawOutput);

	return result.data;
}
