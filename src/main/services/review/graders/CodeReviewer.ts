// Reviews a build or refactor submit through an AI provider: builds the message, parses the reply strictly, and keeps findings honest.
import type { CodeReview, ReviewFinding } from "@shared/types/review";

import { parseModelOutput } from "../parsing/parseModelOutput";
import { loadPrompt, type LoadedPrompt } from "../prompts/loadPrompt";
import type { IReviewProvider } from "../providers/IReviewProvider";
import type { CodeReviewInput } from "../ReviewInputs";
import { invalidOutputError } from "../reviewErrors";
import { codeReviewOutputSchema, toProviderJsonSchema, type CodeReviewOutput } from "../ReviewSchemas";
import { limitCodeBlocks } from "./limitCodeBlocks";
import { compilerOutputText, fileSections, numberedList, tagged, testResultLines } from "./messageSections";

/** Name used in error messages. */
const GRADER_NAME = "code reviewer";

/** The JSON schema sent with every code review. */
const CODE_REVIEW_JSON_SCHEMA = toProviderJsonSchema(codeReviewOutputSchema);

/** Builds the user message for one code review. */
export function buildCodeReviewMessage(input: CodeReviewInput): string
{
	return [
		tagged("quest", `${input.questTitle} (${input.questId})`),
		tagged("brief", input.brief),
		tagged("rubric", numberedList(input.rubric)),
		tagged("patterns", input.patternNames.length > 0 ? input.patternNames.join(", ") : "(the quest names no pattern)"),
		tagged("test_results", testResultLines(input.run)),
		tagged("compiler_output", compilerOutputText(input.run)),
		`<files>\n${fileSections(input.files)}\n</files>`,
	].join("\n\n");
}

/** Counts the lines in a file, for checking cited line numbers. */
function lineCount(content: string): number
{
	return content.split("\n").length;
}

/** Keeps a finding's file and line only when they point at real code, and trims any solution-sized code out of its detail. */
function cleanFinding(finding: CodeReviewOutput["findings"][number], files: Record<string, string>): ReviewFinding
{
	const cleaned: ReviewFinding = { severity: finding.severity, title: finding.title.trim(), detail: limitCodeBlocks(finding.detail.trim()) };

	const content = finding.file === undefined ? undefined : files[finding.file];
	if (content === undefined) return cleaned;

	cleaned.file = finding.file;
	if (finding.line !== undefined && finding.line <= lineCount(content)) cleaned.line = finding.line;

	return cleaned;
}

/** Asks the provider for a code review and answers a checked `CodeReview`. */
export class CodeReviewer
{
	/** Loads the prompt once. */
	constructor(private readonly prompt: LoadedPrompt = loadPrompt("code-review"))
	{
	}

	/** Reviews one submit. Throws review-invalid-output when the reply does not fit, including a rubric answer per line. */
	async review(provider: IReviewProvider, input: CodeReviewInput, signal?: AbortSignal): Promise<CodeReview>
	{
		const rawOutput = await provider.complete({ systemPrompt: this.prompt.text, userMessage: buildCodeReviewMessage(input), jsonSchema: CODE_REVIEW_JSON_SCHEMA, signal });
		const output = parseModelOutput(GRADER_NAME, codeReviewOutputSchema, rawOutput);

		if (output.rubric.length !== input.rubric.length)
		{
			throw invalidOutputError(GRADER_NAME, `it answered ${output.rubric.length} rubric lines but the quest has ${input.rubric.length}.`, rawOutput);
		}

		return {
			score: Math.round(output.score),
			summary: output.summary.trim(),

			// Lines are matched by position and given the quest's exact wording, so a paraphrase never shows on the loot screen.
			rubric: output.rubric.map((result, index) => ({ line: input.rubric[index] ?? result.line, met: result.met, note: result.note.trim() })),
			findings: output.findings.map((finding) => cleanFinding(finding, input.files)),
			reflectionQuestion: output.reflectionQuestion.trim(),
			alternativeHint: limitCodeBlocks(output.alternativeHint.trim()),
			provider: provider.id,
		};
	}
}
