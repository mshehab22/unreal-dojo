// Loads the versioned grader prompts that ship inside the main bundle and strips their header comment before they are sent.
import breakdownGraderPrompt from "./breakdown-grader.md?raw";
import codeReviewPrompt from "./code-review.md?raw";
import explainGraderPrompt from "./explain-grader.md?raw";
import findingExplainerPrompt from "./finding-explainer.md?raw";

/** The four system prompts, one per grader. */
export type PromptName = "code-review" | "breakdown-grader" | "explain-grader" | "finding-explainer";

/** One loaded prompt: its version from the header comment and the text sent to the model. */
export interface LoadedPrompt
{
	/** Which prompt. */
	name: PromptName;

	/** Version number from the `<!-- prompt: name, version N -->` header. */
	version: number;

	/** The prompt text without the header comment. */
	text: string;
}

/** Matches the header comment on the first line of every prompt file. */
const HEADER_PATTERN = /^<!--\s*prompt:\s*([a-z-]+),\s*version\s+(\d+)\b[^>]*-->\s*\n/;

/** Raw file text by prompt name. */
const RAW_PROMPTS: Record<PromptName, string> = {
	"code-review": codeReviewPrompt,
	"breakdown-grader": breakdownGraderPrompt,
	"explain-grader": explainGraderPrompt,
	"finding-explainer": findingExplainerPrompt,
};

/** Parses one prompt file. Throws at startup if a file lost its header or names the wrong prompt, so a broken prompt never reaches a learner. */
export function loadPrompt(name: PromptName, raw: string = RAW_PROMPTS[name]): LoadedPrompt
{
	const header = HEADER_PATTERN.exec(raw);
	if (!header) throw new Error(`Prompt ${name} has no "<!-- prompt: ${name}, version N -->" header.`);
	if (header[1] !== name) throw new Error(`Prompt file for ${name} says it is ${header[1]}.`);

	return { name, version: Number(header[2]), text: raw.slice(header[0].length).trim() };
}
