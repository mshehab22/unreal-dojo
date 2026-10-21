// The concept card: the explanation with hover terms and the editable example, then on to the questions.
import { ArrowRightIcon } from "lucide-react";

import type { ConceptQuest } from "@shared/types/content";

import { Panel } from "@/components/Panel";
import { TermText } from "@/components/TermText";
import { Button } from "@/components/ui/button";

import { ExampleScratch } from "./ExampleScratch";

/** Props for CardStep. */
interface CardStepProps
{
	readonly quest: ConceptQuest;
	readonly onDone: () => void;
}

/** The card text beside the concepts it covers, the example under it, and the button to the questions. */
export function CardStep({ quest, onDone }: CardStepProps)
{
	return (
		<div data-testid="card-step" className="flex flex-col gap-5">
			<div className="grid grid-cols-[minmax(0,1fr)_16rem] gap-5">
				<Panel title="The card">
					<TermText markdown={quest.card} className="text-base" />
				</Panel>
				<Panel title="You will know" className="self-start">
					<ul className="flex flex-col gap-2 text-sm text-paper-muted">
						{quest.concepts.map((concept) => (
							<li key={concept} className="border-l-2 border-pack pl-3">
								{concept}
							</li>
						))}
					</ul>
				</Panel>
			</div>
			<Panel>
				<ExampleScratch questId={quest.id} example={quest.example} termIds={quest.terms} />
			</Panel>
			<Button variant="pack" className="self-start" onClick={onDone}>
				Answer the questions
				<ArrowRightIcon />
			</Button>
		</div>
	);
}
