// The last Submit of this quest, kept when the learner comes back from the loot screen: passed or not, the score, the loot link, and Retry review.
import { ArrowRightIcon, RefreshCwIcon } from "lucide-react";

import type { AttemptOutcome } from "@shared/types/progress";
import type { CodeReview } from "@shared/types/review";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Props for LastSubmitCard. */
interface LastSubmitCardProps
{
	readonly outcome: AttemptOutcome;
	readonly review: CodeReview | undefined;
	readonly onOpenLoot: () => void;
	readonly onRetryReview: () => void;
	readonly isRetrying: boolean;
}

/** A compact card; Retry review shows only when the review fell back after a timeout (A300). */
export function LastSubmitCard({ outcome, review, onOpenLoot, onRetryReview, isRetrying }: LastSubmitCardProps)
{
	const passed = outcome.attempt.passed;

	return (
		<div data-testid="last-submit" data-passed={passed} className={cn("flex flex-col gap-2 rounded-md border p-3", passed ? "border-pass/50 bg-pass/5" : "border-line bg-raised")}>
			<span className={cn("text-sm font-medium", passed ? "text-pass" : "text-paper")}>
				Last submit: {passed ? "passed" : "not passed yet"}, score {outcome.attempt.score}
			</span>
			{review?.fallbackReason && <p className="text-xs text-warn">{review.fallbackReason}</p>}
			<div className="flex flex-wrap gap-2">
				<Button size="sm" variant="secondary" className="h-auto min-h-8 py-1.5 whitespace-normal" onClick={onOpenLoot}>
					Loot and review
					<ArrowRightIcon />
				</Button>
				{review?.retryReviewSuggested && (
					<Button size="sm" variant="outline" className="h-auto min-h-8 py-1.5 whitespace-normal" onClick={onRetryReview} disabled={isRetrying} data-testid="retry-review">
						<RefreshCwIcon />
						{isRetrying ? "Asking again" : "Retry review"}
					</Button>
				)}
			</div>
		</div>
	);
}
