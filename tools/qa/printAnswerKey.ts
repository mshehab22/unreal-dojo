// Prints the answer to every question a learner can meet (concept predicts and questions, pattern recall and scenarios, Parsons blocks) as JSON.
// The opt-in learner-flow e2e spec reads it to answer real-bridge quests and drills, whose items arrive in a random order. Run from the project folder.
import { resolve } from "node:path";

import { ContentLoader } from "../../src/main/services/content";
import type { Question } from "../../src/shared/types/content";

/** One question's prompt and what a right answer looks like. */
interface AnsweredQuestion
{
	prompt: string;
	type: Question["type"];

	/** The right choice's input value: the authored index (multiple choice) or the pattern id (which pattern). Choices are shown shuffled. */
	choiceValue?: string;

	/** A text answer the grader accepts (fill in the blank, explain in one sentence). */
	text?: string;

	/** The 1-based line to mark (spot the bug). */
	bugLine?: number;
}

/** One Parsons block's prompt and how many lines it has, in order (`line-0` to `line-<count - 1>`). */
interface AnsweredParsons
{
	prompt: string;
	lineCount: number;
}

/** The answer to one question, in the shape the spec uses. */
function answerOf(question: Question): AnsweredQuestion
{
	const base = { prompt: question.prompt, type: question.type };

	if (question.type === "multiple-choice") return { ...base, choiceValue: String(question.answerIndex) };
	if (question.type === "which-pattern") return { ...base, choiceValue: question.answer };
	if (question.type === "fill-blank") return { ...base, text: question.acceptedAnswers[0] ?? "" };
	if (question.type === "spot-the-bug") return { ...base, bugLine: question.bugLine };

	return { ...base, text: question.modelAnswer };
}

/** Loads `content/` and writes `{ questions, parsons }` to standard output. */
async function main(): Promise<void>
{
	const content = await new ContentLoader(resolve("content")).load();
	const questions: AnsweredQuestion[] = [];
	const parsons: AnsweredParsons[] = [];

	for (const quest of content.packs.flatMap((pack) => pack.worlds.flatMap((world) => world.quests)))
	{
		if (quest.kind === "concept")
		{
			questions.push(answerOf(quest.predict));
			quest.questions.forEach((question) => questions.push(answerOf(question)));
		}

		if ((quest.kind === "build" || quest.kind === "refactor") && quest.parsons) quest.parsons.forEach((block) => parsons.push({ prompt: block.prompt, lineCount: block.lines.length }));
	}

	for (const card of content.patterns)
	{
		card.recall.forEach((question) => questions.push(answerOf(question)));
		card.scenarios.forEach((question) => questions.push(answerOf(question)));
	}

	process.stdout.write(JSON.stringify({ questions, parsons }));
}

void main();
