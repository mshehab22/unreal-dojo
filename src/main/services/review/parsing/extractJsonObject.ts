// Finds the one JSON object in a model reply, whether it came bare, inside a markdown fence, or wrapped in prose.

/** What the extractor found: the parsed value, or why nothing usable was there. */
export type JsonExtraction = { found: true; value: unknown } | { found: false; problem: string };

/** Pattern for a fenced block such as ```json ... ```. */
const FENCE_PATTERN = /```(?:json|JSON)?\s*\n([\s\S]*?)```/g;

/** Tries to parse text as JSON, answering undefined instead of throwing. */
function tryParse(text: string): unknown
{
	try
	{
		return JSON.parse(text);
	}
	catch
	{
		return undefined;
	}
}

/** Returns the first balanced `{ ... }` span starting at `start`, skipping braces inside strings, or null when it never closes. */
function balancedObjectFrom(text: string, start: number): string | null
{
	let depth = 0;
	let insideString = false;
	let escaped = false;

	for (let index = start; index < text.length; index++)
	{
		const character = text[index];

		if (insideString)
		{
			if (escaped) escaped = false;
			else if (character === "\\") escaped = true;
			else if (character === "\"") insideString = false;

			continue;
		}

		if (character === "\"") insideString = true;
		else if (character === "{") depth++;
		else if (character === "}")
		{
			depth--;
			if (depth === 0) return text.slice(start, index + 1);
		}
	}

	return null;
}

/** True for a plain JSON object (not an array, not null). */
function isObject(value: unknown): boolean
{
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Extracts the JSON object from a model reply. Tries the whole text, then fenced blocks, then the first balanced object in the prose. */
export function extractJsonObject(text: string): JsonExtraction
{
	const trimmed = text.trim();
	if (trimmed.length === 0) return { found: false, problem: "the reply was empty." };

	const whole = tryParse(trimmed);
	if (isObject(whole)) return { found: true, value: whole };

	for (const match of trimmed.matchAll(FENCE_PATTERN))
	{
		const fenced = tryParse((match[1] ?? "").trim());
		if (isObject(fenced)) return { found: true, value: fenced };
	}

	const firstBrace = trimmed.indexOf("{");
	if (firstBrace === -1) return { found: false, problem: "the reply held no JSON object." };

	for (let start = firstBrace; start !== -1; start = trimmed.indexOf("{", start + 1))
	{
		const candidate = balancedObjectFrom(trimmed, start);
		if (candidate === null) return { found: false, problem: "the JSON object was cut off before it closed." };

		const parsed = tryParse(candidate);
		if (isObject(parsed)) return { found: true, value: parsed };
	}

	return { found: false, problem: "the reply's JSON could not be parsed." };
}
