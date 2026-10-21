// Splits a quest file into its YAML front matter and its level-1 sections, ignoring headings inside code fences.
import { FenceTracker } from "./FenceTracker";

/** One `# Title` section: its title, its body text, and the file line of its heading. */
export interface MarkdownSection
{
	title: string;
	body: string;

	/** 1-based file line of the `# Title` heading. */
	line: number;

	/** 1-based file line where the body starts (the line after the heading). */
	bodyLine: number;
}

/** A quest file cut into pieces, or the reason it could not be cut. */
export type SplitQuestFile =
	| { ok: true; frontMatter: string; frontMatterLine: number; sections: MarkdownSection[]; textBeforeFirstSectionLine?: number }
	| { ok: false; message: string; line: number };

/** Matches a level-1 heading and captures its title. */
const HEADING_PATTERN = /^#[ \t]+(.+?)[ \t]*#*[ \t]*$/;

/** Cuts the text of a quest file. Line endings may be `\n` or `\r\n`. */
export function splitQuestFile(text: string): SplitQuestFile
{
	const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);

	if (lines[0]?.trim() !== "---") return { ok: false, message: "front matter missing: the file must start with a --- line", line: 1 };

	const closingIndex = lines.indexOf("---", 1);

	if (closingIndex < 0) return { ok: false, message: "front matter not closed: add a --- line after it", line: 1 };

	const frontMatter = lines.slice(1, closingIndex).join("\n");
	const sections: MarkdownSection[] = [];
	const fences = new FenceTracker();
	let current: { title: string; line: number; bodyLines: string[] } | undefined;
	let textBeforeFirstSectionLine: number | undefined;

	for (let index = closingIndex + 1; index < lines.length; index++)
	{
		const line = lines[index] ?? "";
		const insideFence = fences.consume(line);
		const heading = insideFence ? null : HEADING_PATTERN.exec(line);

		if (heading?.[1] !== undefined)
		{
			if (current !== undefined) sections.push(finishSection(current));

			current = { title: heading[1], line: index + 1, bodyLines: [] };
			continue;
		}

		if (current !== undefined) current.bodyLines.push(line);
		else if (line.trim() !== "" && textBeforeFirstSectionLine === undefined) textBeforeFirstSectionLine = index + 1;
	}

	if (current !== undefined) sections.push(finishSection(current));

	if (fences.isOpen) return { ok: false, message: "a code fence is never closed", line: lines.length };

	const result: SplitQuestFile = { ok: true, frontMatter, frontMatterLine: 2, sections };

	if (textBeforeFirstSectionLine !== undefined) result.textBeforeFirstSectionLine = textBeforeFirstSectionLine;

	return result;
}

/** Turns collected lines into a section, trimming blank lines at both ends of the body and keeping its start line right. */
function finishSection(collected: { title: string; line: number; bodyLines: string[] }): MarkdownSection
{
	const leadingBlankLines = collected.bodyLines.findIndex((line) => line.trim() !== "");
	const skipped = leadingBlankLines < 0 ? 0 : leadingBlankLines;

	return {
		title: collected.title,
		line: collected.line,
		bodyLine: collected.line + 1 + skipped,
		body: collected.bodyLines.slice(skipped).join("\n").trimEnd(),
	};
}
