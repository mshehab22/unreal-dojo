// Reads the body of one quest section as code, YAML data, a bullet list, or level-2 subsections.
import { FenceTracker } from "./FenceTracker";
import { parseYaml } from "./parseYaml";
import type { ProblemList } from "./ProblemList";
import type { MarkdownSection } from "./splitQuestFile";

/** One fenced code block: its language tag, its code, and the file line of its opening fence. */
export interface CodeBlock
{
	language: string;
	code: string;
	line: number;
}

/** A `## Title` subsection inside a section. */
export interface Subsection
{
	title: string;
	body: string;
	line: number;
}

/** Matches an opening fence and captures the fence and the language tag. */
const OPENING_FENCE_PATTERN = /^\s{0,3}(`{3,}|~{3,})\s*([\w+#-]*)/;

/** Matches a level-2 heading and captures its title. */
const SUBHEADING_PATTERN = /^##[ \t]+(.+?)[ \t]*#*[ \t]*$/;

/** Matches the start of a top-level bullet. */
const BULLET_PATTERN = /^[-*][ \t]+(.*)$/;

/** Splits text into its fenced code blocks and the text outside them. `firstLine` is the file line of the text's first line. */
function scanFences(text: string, firstLine: number): { blocks: CodeBlock[]; outsideText: string }
{
	const lines = text.split("\n");
	const blocks: CodeBlock[] = [];
	const outside: string[] = [];
	const fences = new FenceTracker();
	let current: CodeBlock | undefined;
	let codeLines: string[] = [];

	lines.forEach((line, index) =>
	{
		const wasOpen = fences.isOpen;
		const isFenceLine = fences.consume(line);

		if (!isFenceLine)
		{
			outside.push(line);
			return;
		}

		if (!wasOpen)
		{
			const match = OPENING_FENCE_PATTERN.exec(line);
			current = { language: (match?.[2] ?? "").toLowerCase(), code: "", line: firstLine + index };
			codeLines = [];
			return;
		}

		if (!fences.isOpen && current !== undefined)
		{
			current.code = codeLines.join("\n");
			blocks.push(current);
			current = undefined;
			return;
		}

		codeLines.push(line);
	});

	return { blocks, outsideText: outside.join("\n").trim() };
}

/** Reads a section (or subsection) that must hold exactly one code block in `language` and nothing else. */
export function readSingleCodeBlock(body: string, bodyLine: number, language: string, sectionName: string, problems: ProblemList): string
{
	const { blocks, outsideText } = scanFences(body, bodyLine);
	const location = { section: sectionName, line: bodyLine };

	if (blocks.length !== 1)
	{
		problems.add(`expected exactly one \`\`\`${language} code block, found ${blocks.length}`, location);
		return "";
	}

	const block = blocks[0] as CodeBlock;

	if (block.language !== language) problems.add(`the code block must be tagged \`\`\`${language} (found "${block.language || "no tag"}")`, { section: sectionName, line: block.line });
	if (outsideText !== "") problems.add("only the code block may be in this section; move the text into another section", location);
	if (block.code.trim() === "") problems.add("the code block is empty", { section: sectionName, line: block.line });

	return block.code;
}

/** Reads a section whose body is exactly one ```yaml block, returning the parsed data (undefined when it fails). */
export function readYamlBlock(section: MarkdownSection, problems: ProblemList): unknown
{
	const before = problems.count;
	const source = readSingleCodeBlock(section.body, section.bodyLine, "yaml", section.title, problems);

	if (problems.count > before) return undefined;

	const result = parseYaml(source);

	if (result.ok) return result.data;

	// The fence line sits just before the YAML, so YAML line 1 is the file line after the fence.
	const fenceLine = section.bodyLine + section.body.split("\n").findIndex((line) => line.trimStart().startsWith("```"));

	problems.add(result.message, { section: section.title, line: fenceLine + result.line });
	return undefined;
}

/** Reads a section whose body is a top-level bullet list; indented lines continue the bullet above them. */
export function readBulletList(section: MarkdownSection, problems: ProblemList): string[]
{
	const bullets: string[] = [];
	const before = problems.count;

	section.body.split("\n").forEach((line, index) =>
	{
		if (line.trim() === "") return;

		const bullet = BULLET_PATTERN.exec(line);

		if (bullet?.[1] !== undefined)
		{
			bullets.push(bullet[1].trim());
			return;
		}

		if (/^\s/.test(line) && bullets.length > 0)
		{
			bullets[bullets.length - 1] += ` ${line.trim()}`;
			return;
		}

		problems.add("expected a bullet list (each line starting with \"- \")", { section: section.title, line: section.bodyLine + index });
	});

	if (bullets.length === 0 && problems.count === before) problems.add("the list is empty", { section: section.title, line: section.line });

	return bullets;
}

/** Splits a section body into `## Title` subsections, ignoring headings inside code fences. Text before the first is returned too. */
export function readSubsections(section: MarkdownSection): { leadingText: string; subsections: Subsection[] }
{
	const lines = section.body.split("\n");
	const fences = new FenceTracker();
	const subsections: Subsection[] = [];
	const leading: string[] = [];
	let current: { title: string; line: number; lines: string[] } | undefined;

	lines.forEach((line, index) =>
	{
		const insideFence = fences.consume(line);
		const heading = insideFence ? null : SUBHEADING_PATTERN.exec(line);

		if (heading?.[1] !== undefined)
		{
			if (current !== undefined) subsections.push({ title: current.title, line: current.line, body: current.lines.join("\n") });

			current = { title: heading[1], line: section.bodyLine + index, lines: [] };
			return;
		}

		if (current !== undefined) current.lines.push(line);
		else leading.push(line);
	});

	if (current !== undefined) subsections.push({ title: current.title, line: current.line, body: current.lines.join("\n") });

	return { leadingText: leading.join("\n").trim(), subsections };
}

/** Requires a section's body to be non-empty Markdown and returns it. */
export function readMarkdown(section: MarkdownSection, problems: ProblemList): string
{
	if (section.body.trim() === "") problems.add("the section is empty", { section: section.title, line: section.line });

	return section.body;
}
