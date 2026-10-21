// The code review on the loot screen: who reviewed, the summary, rubric lines met or not, findings grouped by severity with a free Why?, and the reflection question.
import { CheckIcon, RefreshCwIcon, XIcon } from "lucide-react";

import type { CodeReview, FindingSeverity } from "@shared/types/review";

import { Button } from "@/components/ui/button";
import { reviewProviderLabel } from "@/lib/reviewProviderLabel";

import { FindingRow } from "./FindingRow";
import { ReflectionBox } from "./ReflectionBox";

/** Props for CodeReviewSection. */
interface CodeReviewSectionProps
{
	readonly review: CodeReview;
	readonly attemptId: string;
	readonly onRetryReview: () => void;
	readonly isRetrying: boolean;
}

/** Severity groups in reading order, with their headings. */
const SEVERITY_GROUPS: readonly { severity: FindingSeverity; title: string }[] = [
	{ severity: "problem", title: "Problems" },
	{ severity: "suggestion", title: "Suggestions" },
	{ severity: "praise", title: "What works" },
];

/** The whole review. Retry review appears when a timeout made tests-only answer (A300). */
export function CodeReviewSection({ review, attemptId, onRetryReview, isRetrying }: CodeReviewSectionProps)
{
	const indexed = review.findings.map((finding, index) => ({ finding, index }));

	return (
		<div data-testid="code-review" data-provider={review.provider} className="flex flex-col gap-5">
			<div className="flex flex-col gap-2">
				<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">Reviewed by {reviewProviderLabel(review.provider)}</span>
				{review.fallbackReason && (
					<div data-testid="review-fallback" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-warn/50 bg-warn/5 p-3 text-sm text-warn">
						<span>{review.fallbackReason}</span>
						{review.retryReviewSuggested && (
							<Button size="sm" variant="outline" onClick={onRetryReview} disabled={isRetrying} data-testid="retry-review">
								<RefreshCwIcon />
								{isRetrying ? "Asking again" : "Retry review"}
							</Button>
						)}
					</div>
				)}
				<p className="text-base text-paper">{review.summary}</p>
			</div>

			<ul data-testid="rubric-results" className="flex flex-col gap-1.5">
				{review.rubric.map((line) => (
					<li key={line.line} data-met={line.met} className="flex items-start gap-2 text-sm">
						{line.met ? <CheckIcon className="mt-0.5 size-4 shrink-0 text-pass" strokeWidth={3} /> : <XIcon className="mt-0.5 size-4 shrink-0 text-fail" strokeWidth={3} />}
						<span className={line.met ? "text-paper" : "text-paper-muted"}>
							{line.line} <span className="text-paper-faint">{line.note}</span>
						</span>
					</li>
				))}
			</ul>

			{SEVERITY_GROUPS.map((group) =>
			{
				const members = indexed.filter((entry) => entry.finding.severity === group.severity);

				return members.length > 0 ? (
					<div key={group.severity} className="flex flex-col gap-2">
						<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">{group.title}</span>
						<ul className="flex flex-col gap-2">
							{members.map((entry) => (
								<FindingRow key={entry.index} finding={entry.finding} attemptId={attemptId} findingIndex={entry.index} />
							))}
						</ul>
					</div>
				) : null;
			})}

			<ReflectionBox key={attemptId} attemptId={attemptId} question={review.reflectionQuestion} />
		</div>
	);
}
