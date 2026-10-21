// The zod schemas for what each grader asks the model to return, and the JSON schemas sent to the providers built from them.
import { z } from "zod";

/** A score from 0 to 100. Fractions are accepted and rounded by the graders. */
const scoreSchema = z.number().min(0).max(100);

/** Text the model must not leave empty. */
const requiredTextSchema = z.string().trim().min(1);

/** What the code reviewer returns (the `provider` field is added by the app). */
export const codeReviewOutputSchema = z.strictObject({
	score: scoreSchema,
	summary: requiredTextSchema,
	rubric: z.array(z.strictObject({ line: z.string(), met: z.boolean(), note: z.string() })),
	findings: z.array(z.strictObject({
		severity: z.enum(["problem", "suggestion", "praise"]),
		title: requiredTextSchema,
		detail: requiredTextSchema,
		file: z.string().optional(),
		// Any integer: a line below 1 or past the file is dropped by the code reviewer instead of failing the whole review.
		line: z.number().int().optional(),
	})),
	reflectionQuestion: requiredTextSchema,
	alternativeHint: z.string(),
});

/** What the breakdown grader returns (the `provider` field is added by the app). */
export const breakdownGradeOutputSchema = z.strictObject({
	score: scoreSchema,
	summary: requiredTextSchema,
	requiredPiecesCovered: z.array(z.strictObject({ label: z.string(), covered: z.boolean(), matchedTo: z.string().optional() })),
	concerns: z.array(z.string()),
	strengths: z.array(z.string()),
	revisionQuality: scoreSchema,
	alternativeToShow: z.number().int().min(0),
});

/** What the explain grader returns (the `provider` field is added by the app). */
export const explainGradeOutputSchema = z.strictObject({
	score: scoreSchema,
	verdict: z.enum(["correct", "partly", "incorrect"]),
	note: requiredTextSchema,
});

/** What the finding explainer returns. */
export const findingExplanationOutputSchema = z.strictObject({
	explanation: requiredTextSchema,
});

/** The tiny answer the Claude Code connection test asks for. */
export const connectionCheckOutputSchema = z.strictObject({
	ok: z.boolean(),
});

/** The model output shape of the code reviewer. */
export type CodeReviewOutput = z.infer<typeof codeReviewOutputSchema>;

/** The model output shape of the breakdown grader. */
export type BreakdownGradeOutput = z.infer<typeof breakdownGradeOutputSchema>;

/** The model output shape of the explain grader. */
export type ExplainGradeOutput = z.infer<typeof explainGradeOutputSchema>;

/** A JSON schema as plain data, ready to send to a provider. */
export type JsonSchemaObject = Record<string, unknown>;

/** Keywords structured output does not support. The prompts state the ranges in words, and zod still enforces them on the reply. */
const UNSUPPORTED_KEYWORDS = new Set(["$schema", "minLength", "maxLength", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum"]);

/** Copies a JSON schema value, dropping unsupported keywords at every level. Property names are kept even if they match a keyword. */
function withoutUnsupportedKeywords(value: unknown, isPropertyMap = false): unknown
{
	if (Array.isArray(value)) return value.map((item) => withoutUnsupportedKeywords(item));
	if (typeof value !== "object" || value === null) return value;

	const copy: JsonSchemaObject = {};

	for (const [key, child] of Object.entries(value))
	{
		if (!isPropertyMap && UNSUPPORTED_KEYWORDS.has(key)) continue;

		copy[key] = withoutUnsupportedKeywords(child, !isPropertyMap && key === "properties");
	}

	return copy;
}

/** Turns a zod schema into the plain JSON schema sent to both providers: objects closed, enums kept, range keywords removed. */
export function toProviderJsonSchema(schema: z.ZodType): JsonSchemaObject
{
	return withoutUnsupportedKeywords(z.toJSONSchema(schema, { io: "output" })) as JsonSchemaObject;
}
