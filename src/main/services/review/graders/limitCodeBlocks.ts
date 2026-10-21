// A last guard against a reviewer that writes the solution: any fenced code block longer than one line is removed from feedback text.

/** Matches a fenced code block and captures its body. */
const FENCED_BLOCK_PATTERN = /```[^\n]*\n([\s\S]*?)```/g;

/** What replaces a removed block, so the learner knows something was held back on purpose. */
export const REMOVED_CODE_NOTE = "(code removed: the mentor shows at most one corrected line)";

/** Keeps fenced blocks of at most one non-empty line and replaces longer ones with a short note. */
export function limitCodeBlocks(text: string): string
{
	return text.replace(FENCED_BLOCK_PATTERN, (block, body: string) =>
	{
		const codeLines = body.split("\n").filter((line) => line.trim().length > 0);

		return codeLines.length <= 1 ? block : REMOVED_CODE_NOTE;
	});
}
