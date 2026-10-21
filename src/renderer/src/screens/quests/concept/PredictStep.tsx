// The concept quest's first step: a guess before the card, never penalized. Locking it in shows the answer and why.
import { ArrowRightIcon, LightbulbIcon } from "lucide-react";
import { useState } from "react";

import type { Question } from "@shared/types/content";
import type { ItemResponse } from "@shared/types/progress";

import { Panel } from "@/components/Panel";
import { QuestionInput } from "@/components/quests/QuestionInput";
import { TermText } from "@/components/TermText";
import { Button } from "@/components/ui/button";

/** Props for PredictStep. */
interface PredictStepProps
{
	readonly predict: Question;
	readonly onDone: (prediction: ItemResponse | null) => void;
}

/** Shows the predict question; after the guess, the right answer is marked with the explanation, then the card opens. */
export function PredictStep({ predict, onDone }: PredictStepProps)
{
	const [guess, setGuess] = useState<ItemResponse | null>(null);
	const [revealed, setRevealed] = useState(false);

	return (
		<Panel title="Predict first" testId="predict-step" className="max-w-3xl">
			<p className="flex items-center gap-2 text-sm text-paper-faint">
				<LightbulbIcon className="size-4 text-pack" />
				A guess before the card. Wrong guesses cost nothing; they make the card stick.
			</p>
			<QuestionInput question={predict} response={guess} onChange={setGuess} disabled={revealed} revealed={revealed} />
			{revealed && (
				<div data-testid="predict-reveal" className="rounded-md border border-line bg-raised p-4">
					<TermText markdown={predict.explanation} />
				</div>
			)}
			<div className="flex gap-2">
				{!revealed ? (
					<>
						<Button variant="pack" disabled={guess === null} onClick={() => setRevealed(true)}>
							Lock in my guess
						</Button>
						<Button variant="ghost" onClick={() => setRevealed(true)}>
							I have no idea, show me
						</Button>
					</>
				) : (
					<Button variant="pack" onClick={() => onDone(guess)} autoFocus>
						Read the card
						<ArrowRightIcon />
					</Button>
				)}
			</div>
		</Panel>
	);
}
