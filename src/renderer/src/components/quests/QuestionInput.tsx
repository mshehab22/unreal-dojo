// One question of any type, ready to answer: the prompt (with hover terms), its code, and the right input. Choices are shuffled per presentation (A61).
import { useId, useState } from "react";

import type { PatternCard, Question } from "@shared/types/content";
import type { ItemResponse } from "@shared/types/progress";

import { TermText } from "@/components/TermText";
import { shuffledOrder } from "@/lib/presentationOrder";

import { ChoiceList } from "./ChoiceList";
import { CodeBlock } from "./CodeBlock";
import { SpotTheBugInput } from "./SpotTheBugInput";

/** Props for QuestionInput. */
interface QuestionInputProps
{
	readonly question: Question;
	readonly response: ItemResponse | null;
	readonly onChange: (response: ItemResponse | null) => void;
	readonly disabled?: boolean;

	/** True once graded: the right answer is marked. */
	readonly revealed?: boolean;

	/** Pattern cards, so which-pattern choices read as titles. */
	readonly patternCards?: readonly PatternCard[];
}

/** The chosen value of a choice response, or null. */
function chosen(response: ItemResponse | null): string | null
{
	return response?.kind === "choice" ? response.choice : null;
}

/** The text of a text response, or empty. */
function written(response: ItemResponse | null): string
{
	return response?.kind === "text" ? response.text : "";
}

/** A text answer, or null when it is blank, so an empty box never counts as answered. */
function textResponse(text: string): ItemResponse | null
{
	return text.trim().length > 0 ? { kind: "text", text } : null;
}

/** The prompt, the code if any, and the input for the question's type. */
export function QuestionInput({ question, response, onChange, disabled = false, revealed = false, patternCards = [] }: QuestionInputProps)
{
	const name = useId();
	const choiceCount = question.type === "multiple-choice" || question.type === "which-pattern" ? question.choices.length : 0;
	const [order] = useState(() => shuffledOrder(choiceCount));
	const titles = new Map(patternCards.map((card) => [card.id, card.title]));

	return (
		<div data-testid="question" data-type={question.type} className="flex flex-col gap-4">
			<TermText markdown={question.prompt} className="text-base text-paper" />
			{question.type !== "spot-the-bug" && "code" in question && question.code && <CodeBlock code={question.code} />}

			{question.type === "multiple-choice" && (
				<ChoiceList
					name={name}
					label={question.prompt}
					options={order.map((authoredIndex) => ({ value: String(authoredIndex), label: <TermText markdown={question.choices[authoredIndex] ?? ""} inline /> }))}
					selected={chosen(response)}
					onSelect={(value) => onChange({ kind: "choice", choice: value })}
					disabled={disabled}
					{...(revealed ? { rightValue: String(question.answerIndex) } : {})}
				/>
			)}

			{question.type === "which-pattern" && (
				<ChoiceList
					name={name}
					label={question.prompt}
					options={order.map((authoredIndex) =>
					{
						const patternId = question.choices[authoredIndex] ?? "";

						return { value: patternId, label: titles.get(patternId) ?? patternId };
					})}
					selected={chosen(response)}
					onSelect={(value) => onChange({ kind: "choice", choice: value })}
					disabled={disabled}
					{...(revealed ? { rightValue: question.answer } : {})}
				/>
			)}

			{question.type === "fill-blank" && (
				<label className="flex flex-col gap-1.5">
					<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">Fill the blank</span>
					<input
						data-testid="fill-blank-input"
						value={written(response)}
						onChange={(event) => onChange(textResponse(event.target.value))}
						disabled={disabled}
						spellCheck={false}
						autoComplete="off"
						className="h-10 w-72 max-w-full rounded-md border border-input bg-ink px-3 font-mono text-sm text-paper outline-none select-text focus-visible:border-pack focus-visible:ring-2 focus-visible:ring-ring"
					/>
				</label>
			)}

			{question.type === "spot-the-bug" && (
				<SpotTheBugInput name={name} code={question.code} selected={chosen(response)} onSelect={(line) => onChange({ kind: "choice", choice: line })} disabled={disabled} {...(revealed ? { bugLine: question.bugLine } : {})} />
			)}

			{question.type === "explain-in-one-sentence" && (
				<label className="flex flex-col gap-1.5">
					<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">One sentence, in your own words</span>
					<textarea
						data-testid="explain-input"
						value={written(response)}
						onChange={(event) => onChange(textResponse(event.target.value))}
						disabled={disabled}
						rows={3}
						maxLength={400}
						className="resize-none rounded-md border border-input bg-ink px-3 py-2 text-sm text-paper outline-none select-text focus-visible:border-pack focus-visible:ring-2 focus-visible:ring-ring"
					/>
				</label>
			)}
		</div>
	);
}
