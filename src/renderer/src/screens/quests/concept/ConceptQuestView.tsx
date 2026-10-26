// A concept quest from start to loot: predict, read the card and play with the example, answer the questions, then see the results.
import { ArrowRightIcon, TrophyIcon } from "lucide-react";
import { useState } from "react";

import type { ConceptQuest } from "@shared/types/content";
import type { ConceptOutcome, ConceptSubmission, ItemResponse } from "@shared/types/progress";

import { useNavigate } from "@/app/router/useRoute";
import { AppErrorView } from "@/components/AppErrorView";
import { QuestStepRail } from "@/components/quests/QuestStepRail";
import { QuestTitleRow } from "@/components/quests/QuestTitleRow";
import { Button } from "@/components/ui/button";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoAction } from "@/data/useDojoAction";
import { useDojoQuery } from "@/data/useDojoQuery";

import { useLootStore } from "../loot/useLootStore";
import { CardStep } from "./CardStep";
import { PredictStep } from "./PredictStep";
import { QuestionsStep } from "./QuestionsStep";

/** The steps a concept quest moves through. */
const STEPS = ["Predict", "Card", "Questions"] as const;

/** Props for ConceptQuestView. */
interface ConceptQuestViewProps
{
	readonly quest: ConceptQuest;
}

/** Holds the guess and the answers; submits once; then offers the loot screen. */
export function ConceptQuestView({ quest }: ConceptQuestViewProps)
{
	const navigate = useNavigate();
	const showLoot = useLootStore((state) => state.show);
	const patternCards = useDojoQuery(QUERY_KEYS.patternCards, (client) => client.getPatternCards());
	const [stepIndex, setStepIndex] = useState(0);
	const [prediction, setPrediction] = useState<ItemResponse | null>(null);
	const [answers, setAnswers] = useState<(ItemResponse | null)[]>(() => quest.questions.map(() => null));
	const [outcome, setOutcome] = useState<ConceptOutcome | null>(null);
	const submit = useDojoAction((client, submission: ConceptSubmission) => client.submitConcept(submission), [QUERY_KEYS.progress, QUERY_KEYS.availability, QUERY_KEYS.drillSummary]);

	/** Records one answer. */
	const answer = (index: number, response: ItemResponse | null): void =>
	{
		setAnswers((current) => current.map((existing, position) => (position === index ? response : existing)));
	};

	/** Grades every answer at once. */
	const grade = async (): Promise<void> =>
	{
		const graded = await submit.run({ questId: quest.id, prediction, answers: answers.map((given) => given ?? { kind: "text", text: "" }) });

		if (graded) setOutcome(graded);
	};

	/** Hands the attempt to the loot screen. */
	const openLoot = (): void =>
	{
		if (!outcome) return;

		showLoot({ quest, outcome: outcome.outcome, detail: { kind: "concept", results: outcome.results } });
		navigate("loot", { quest: quest.id });
	};

	// Self-checked explain answers are neither right nor wrong (A801): the line counts graded answers and names the rest.
	const gradedResults = outcome?.results.filter((result) => !result.selfChecked) ?? [];
	const correctCount = gradedResults.filter((result) => result.correct).length;
	const selfCheckedCount = (outcome?.results.length ?? 0) - gradedResults.length;

	return (
		<div data-testid="concept-quest" className="flex flex-col gap-6">
			<QuestTitleRow quest={quest} />
			<QuestStepRail steps={STEPS} currentIndex={outcome ? STEPS.length : stepIndex} />
			{stepIndex === 0 && (
				<PredictStep
					predict={quest.predict}
					onDone={(guess) =>
					{
						setPrediction(guess);
						setStepIndex(1);
					}}
				/>
			)}
			{stepIndex === 1 && <CardStep quest={quest} onDone={() => setStepIndex(2)} />}
			{stepIndex === 2 && (
				<>
					<QuestionsStep questions={quest.questions} answers={answers} onAnswer={answer} results={outcome?.results ?? null} onSubmit={() => void grade()} isSubmitting={submit.isPending} patternCards={patternCards.data ?? []} />
					{submit.error && <AppErrorView error={submit.error} onRetry={() => void grade()} />}
					{outcome && (
						<div data-testid="concept-result" className="flex max-w-3xl items-center justify-between gap-4 rounded-xl border border-line bg-surface p-5">
							<div className="flex items-center gap-3">
								<TrophyIcon className="size-6 text-pack" />
								<div className="flex flex-col">
									<span className="font-display text-xl font-semibold">
										{correctCount} of {gradedResults.length} right
										{selfCheckedCount > 0 && <span className="text-base font-normal text-paper-muted">, {selfCheckedCount} explained in your own words</span>}
									</span>
									<span className="text-sm text-paper-muted">{outcome.outcome.attempt.passed ? "Passed. The terms join your drills." : "Not passed yet. The misses come back in your next drill."}</span>
								</div>
							</div>
							<Button variant="pack" onClick={openLoot} autoFocus>
								See your loot
								<ArrowRightIcon />
							</Button>
						</div>
					)}
				</>
			)}
		</div>
	);
}
