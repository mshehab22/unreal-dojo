// The review's reflection question with a one-sentence answer box, graded for free. A kept answer and grade come back from the save (A852); a self-check says why no reviewer graded it (A855).
import { useEffect, useState } from "react";

import type { ExplainGrade } from "@shared/types/review";

import { Button } from "@/components/ui/button";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoAction } from "@/data/useDojoAction";
import { useDojoQuery } from "@/data/useDojoQuery";
import { reviewProviderLabel } from "@/lib/reviewProviderLabel";

/** Props for ReflectionBox. */
interface ReflectionBoxProps
{
	readonly attemptId: string;
	readonly question: string;
}

/** The words for an AI grade's verdict. */
const VERDICT_WORDS = { correct: "Well put.", partly: "Partly there.", incorrect: "Not quite." } as const;

/** Fewest words that count as a sentence to send. */
const MINIMUM_WORDS = 4;

/** The question, the box (prefilled with a kept answer), and the grade. Editing the sentence and sending again grades the new one; a self-check after a timeout offers Ask again. */
export function ReflectionBox({ attemptId, question }: ReflectionBoxProps)
{
	const progress = useDojoQuery(QUERY_KEYS.progress, (client) => client.getProgress());
	const kept = progress.data?.attempts.find((attempt) => attempt.attemptId === attemptId)?.reflection;
	const [answer, setAnswer] = useState("");
	const [graded, setGraded] = useState<{ answer: string; grade: ExplainGrade } | null>(null);
	const [prefilled, setPrefilled] = useState(false);
	const send = useDojoAction((client, text: string) => client.answerReflection({ attemptId, answer: text }), [QUERY_KEYS.progress]);

	// A kept answer and its grade come back once, when the save arrives; the learner's typing is never overwritten.
	useEffect(() =>
	{
		if (prefilled || !kept) return;

		setPrefilled(true);
		setAnswer(kept.answer);
		setGraded({ answer: kept.answer, grade: kept.grade });
	}, [kept, prefilled]);

	/** Sends the sentence as it is now. The same kept sentence is answered at once, without asking a reviewer again. */
	const submit = async (): Promise<void> =>
	{
		const text = answer.trim();
		const grade = await send.run(text);

		if (grade) setGraded({ answer: text, grade });
	};

	const shownGrade = graded && graded.answer === answer.trim() ? graded.grade : null;
	const isSelfCheck = shownGrade?.provider === "tests-only";
	const longEnough = answer.trim().split(/\s+/).filter((word) => word.length > 0).length >= MINIMUM_WORDS;

	return (
		<div data-testid="reflection" className="flex flex-col gap-2">
			<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">Reflect</span>
			<p className="text-sm text-paper">{question}</p>
			<textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={2} maxLength={600} aria-label="Your one-sentence answer" className="resize-none rounded-md border border-input bg-ink px-3 py-2 text-sm text-paper outline-none select-text focus-visible:border-pack focus-visible:ring-2 focus-visible:ring-ring" />

			{shownGrade && !isSelfCheck && (
				<p data-testid="reflection-grade" data-provider={shownGrade.provider} className="text-sm text-paper-muted">
					<span className="font-medium text-paper">{VERDICT_WORDS[shownGrade.verdict]}</span> {shownGrade.note} <span className="text-paper-faint">({reviewProviderLabel(shownGrade.provider)})</span>
				</p>
			)}

			{shownGrade && isSelfCheck && (
				<div data-testid="reflection-grade" data-provider="tests-only" className="flex flex-col gap-1 rounded-md border border-line-strong bg-raised p-3 text-sm">
					<span className="font-medium text-paper">Not graded: compare your sentence with the note</span>
					<span className="text-paper-muted">{shownGrade.note}</span>
					{shownGrade.fallbackReason && <span data-testid="reflection-fallback" className="text-xs text-warn">{shownGrade.fallbackReason}</span>}
				</div>
			)}

			{send.error && <p className="text-sm text-fail">{send.error.message}</p>}

			<div className="flex gap-2">
				{!shownGrade && (
					<Button size="sm" variant="secondary" disabled={!longEnough || send.isPending} onClick={() => void submit()} data-testid="reflection-send">
						{send.isPending ? "Reading" : graded ? "Send the new answer" : "Send my answer"}
					</Button>
				)}
				{shownGrade && isSelfCheck && shownGrade.retryReviewSuggested && (
					<Button size="sm" variant="outline" disabled={send.isPending} onClick={() => void submit()} data-testid="reflection-ask-again">
						{send.isPending ? "Asking again" : "Ask again"}
					</Button>
				)}
			</div>
		</div>
	);
}
