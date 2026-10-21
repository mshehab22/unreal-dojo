// Checks choice questions in concept quests and pattern cards: distinct choices, and which-pattern ids and notes.
import type { ContentProblem, Question } from "../../../src/shared/types/content";
import type { ContentCheck } from "../ContentCheck";
import { errorAt } from "./checkHelpers";

/** Distinct choices a multiple-choice or which-pattern question needs. */
const MINIMUM_CHOICES = 3;

/** One question with where to report it. */
interface LocatedQuestion
{
	question: Question;
	file: string;
	section: string;
}

/** Problems with one question's choices, notes, and pattern ids. */
function checkQuestion({ question, file, section }: LocatedQuestion, patternIds: ReadonlySet<string>): ContentProblem[]
{
	if (question.type !== "multiple-choice" && question.type !== "which-pattern") return [];

	const problems: ContentProblem[] = [];
	const where = `question "${question.id}"`;
	const distinct = new Set(question.choices);

	if (distinct.size !== question.choices.length) problems.push(errorAt(file, `${where}: a choice is repeated`, section));
	if (distinct.size < MINIMUM_CHOICES) problems.push(errorAt(file, `${where}: expected at least ${MINIMUM_CHOICES} distinct choices, found ${distinct.size}`, section));

	if (question.type !== "which-pattern") return problems;

	for (const choice of distinct)
	{
		if (!patternIds.has(choice)) problems.push(errorAt(file, `${where}: choice "${choice}" is not a pattern card id`, section));
	}

	const wrongChoices = [...distinct].filter((choice) => choice !== question.answer);
	const noted = new Set(question.distractorNotes.map((note) => note.choice));

	for (const choice of wrongChoices)
	{
		if (!noted.has(choice)) problems.push(errorAt(file, `${where}: no distractor note for wrong choice "${choice}"`, section));
	}

	for (const choice of noted)
	{
		if (!wrongChoices.includes(choice)) problems.push(errorAt(file, `${where}: distractor note for "${choice}", which is not a wrong choice`, section));
	}

	return problems;
}

/** Every concept quest question (predict included) and every pattern card recall and scenario question. */
export const questionCheck: ContentCheck = {
	name: "questions",
	run(input)
	{
		const patternIds = new Set(input.content.patterns.map((card) => card.id));
		const located: LocatedQuestion[] = [];

		for (const { quest, file } of input.quests)
		{
			if (quest.kind !== "concept") continue;

			located.push({ question: quest.predict, file, section: "Predict" });
			located.push(...quest.questions.map((question) => ({ question, file, section: "Questions" })));
		}

		for (const card of input.content.patterns)
		{
			located.push(...[...card.recall, ...card.scenarios].map((question) => ({ question, file: "patterns.json", section: `pattern ${card.id}` })));
		}

		return located.flatMap((entry) => checkQuestion(entry, patternIds));
	},
};
