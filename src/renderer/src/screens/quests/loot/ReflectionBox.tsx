// The review's reflection question with a one-sentence answer box, graded for free.
import { useState } from "react";

import type { ExplainGrade } from "@shared/types/review";

import { Button } from "@/components/ui/button";
import { useDojoAction } from "@/data/useDojoAction";

/** Props for ReflectionBox. */
interface ReflectionBoxProps
{
	readonly attemptId: string;
	readonly question: string;
}

/** The question, the box, and the grader's note. */
export function ReflectionBox({ attemptId, question }: ReflectionBoxProps)
{
	const [answer, setAnswer] = useState("");
	const [grade, setGrade] = useState<ExplainGrade | null>(null);
	const send = useDojoAction((client, text: string) => client.answerReflection({ attemptId, answer: text }));

	/** Sends the sentence. */
	const submit = async (): Promise<void> =>
	{
		const graded = await send.run(answer.trim());

		if (graded) setGrade(graded);
	};

	return (
		<div data-testid="reflection" className="flex flex-col gap-2">
			<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">Reflect</span>
			<p className="text-sm text-paper">{question}</p>
			<textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={2} maxLength={600} disabled={grade !== null} aria-label="Your one-sentence answer" className="resize-none rounded-md border border-input bg-ink px-3 py-2 text-sm text-paper outline-none select-text focus-visible:border-pack focus-visible:ring-2 focus-visible:ring-ring" />
			{grade ? (
				<p data-testid="reflection-grade" className="text-sm text-paper-muted">
					<span className="font-medium text-paper">{grade.verdict === "correct" ? "Well put." : grade.verdict === "partly" ? "Partly there." : "Not quite."}</span> {grade.note}
				</p>
			) : (
				<Button size="sm" variant="secondary" className="self-start" disabled={answer.trim().split(/\s+/).length < 4 || send.isPending} onClick={() => void submit()}>
					{send.isPending ? "Reading" : "Send my answer"}
				</Button>
			)}
		</div>
	);
}
