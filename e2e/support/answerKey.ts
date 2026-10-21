// Answers any question or Parsons block the app shows, from the content's own answer key (tools/qa/printAnswerKey.ts), matched by prompt text.
// Real-bridge drills pick items at random, so the learner-flow spec cannot know in advance which question comes next.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { expect, type Locator } from "@playwright/test";

/** One question's prompt and its right answer, as printAnswerKey.ts writes it. */
export interface AnsweredQuestion
{
	prompt: string;
	type: string;
	choiceValue?: string;
	text?: string;
	bugLine?: number;
}

/** One Parsons block's prompt and how many lines it has in the right order. */
export interface AnsweredParsons
{
	prompt: string;
	lineCount: number;
}

/** Every answer in `content/`. */
export interface AnswerKey
{
	questions: AnsweredQuestion[];
	parsons: AnsweredParsons[];
}

/** Lowercase words only, so Markdown, inline code, and hover-term markup in the rendered prompt compare equal to the authored prompt. */
function words(text: string): string
{
	return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Builds the answer key from the current `content/` folder with tsx (which resolves the app's path aliases). */
export function readAnswerKey(): AnswerKey
{
	const tsxCli = resolve("node_modules/tsx/dist/cli.mjs");
	const json = execFileSync(process.execPath, [tsxCli, resolve("tools/qa/printAnswerKey.ts")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });

	return JSON.parse(json) as AnswerKey;
}

/** The entry whose prompt the shown text starts with; the longest prompt wins when one prompt starts another. */
function findByPrompt<Entry extends { prompt: string }>(entries: Entry[], shownText: string): Entry
{
	const shown = words(shownText);
	const matches = entries.filter((entry) => shown.startsWith(words(entry.prompt))).sort((first, second) => second.prompt.length - first.prompt.length);
	const match = matches[0];

	if (!match) throw new Error(`No answer in content/ for the prompt: ${shownText.slice(0, 160)}`);

	return match;
}

/** Answers one `question` element (a predict, a concept question, or a drill item) with the right answer. */
export async function answerQuestion(key: AnswerKey, question: Locator): Promise<AnsweredQuestion>
{
	const type = await question.getAttribute("data-type");
	const answer = findByPrompt(key.questions.filter((entry) => entry.type === type), await question.innerText());

	if (answer.choiceValue !== undefined)
	{
		await question.locator(`[data-testid="choice"]:has(input[value="${answer.choiceValue}"])`).click();
	}
	else if (answer.bugLine !== undefined)
	{
		await question.getByTestId("bug-line").nth(answer.bugLine - 1).click();
	}
	else if (answer.type === "fill-blank")
	{
		await question.getByTestId("fill-blank-input").fill(answer.text ?? "");
	}
	else
	{
		await question.getByTestId("explain-input").fill(answer.text ?? "");
	}

	return answer;
}

/** Places a Parsons block's real lines in order (line-0, line-1, ...) and leaves the distractors in the pool. */
export async function answerParsons(key: AnswerKey, item: Locator): Promise<void>
{
	const block = findByPrompt(key.parsons, await item.innerText());

	for (let line = 0; line < block.lineCount; line++) await item.locator(`[data-testid="parsons-pool-line"][data-line-id="line-${line}"]`).click();

	await expect(item.locator('[data-testid="parsons-placed-line"]')).toHaveCount(block.lineCount);
}
