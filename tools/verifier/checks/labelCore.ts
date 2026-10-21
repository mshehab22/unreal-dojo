// The part of a breakdown label that names its job, as tests-only grading computes it (A302). A copy for the CLI; a unit test keeps it equal to the reviewer's.

/** Words that say what kind of piece a label is, not what it does (A302). Kept equal to `KIND_WORDS` in the review service by a unit test. */
const KIND_WORDS: ReadonlySet<string> = new Set([
	"component", "actor", "class", "object", "event", "delegate", "data", "asset", "struct", "step",
	"system", "subsystem", "manager", "controller", "handler", "service", "interface", "widget", "base", "on",
]);

/** Splits a label into lower-case words by camel case, capitals, and digits. */
function labelWords(label: string): string[]
{
	return (label.match(/[A-Z]?[a-z]+|[A-Z]+(?![a-z])|\d+/g) ?? []).map((word) => word.toLowerCase());
}

/** True for a kind word or its plural ("systems", "classes"). */
function isKindWord(word: string): boolean
{
	if (KIND_WORDS.has(word)) return true;
	if (word.endsWith("es") && KIND_WORDS.has(word.slice(0, -2))) return true;

	return word.endsWith("s") && KIND_WORDS.has(word.slice(0, -1));
}

/**
 * Every word except kind words and one-letter prefixes, joined: "HealthComponent" gives "health". The review service's
 * module cannot be loaded by the CLI (it imports its prompt files through Vite), so this mirrors its `labelCore`.
 */
export function labelCore(label: string): string
{
	return labelWords(label).filter((word) => word.length > 1 && !isKindWord(word)).join("");
}
