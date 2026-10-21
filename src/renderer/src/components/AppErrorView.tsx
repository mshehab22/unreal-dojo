// The one way an AppError is shown: what went wrong, what to do next, a retry, and the technical detail behind a toggle.
import { ChevronDownIcon, RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";

import type { AppError } from "@shared/types/errors";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Props for AppErrorView. */
interface AppErrorViewProps
{
	readonly error: AppError;
	readonly onRetry?: () => void;
	readonly retryLabel?: string;
	readonly compact?: boolean;
	readonly className?: string;
}

/** Shows an AppError in plain English. Detail stays hidden until asked for. */
export function AppErrorView({ error, onRetry, retryLabel = "Try again", compact = false, className }: AppErrorViewProps)
{
	const [showDetail, setShowDetail] = useState(false);

	return (
		<div role="alert" data-testid="app-error" data-error-code={error.code} className={cn("flex gap-3 rounded-lg border border-fail/30 bg-fail/[0.06]", compact ? "p-3" : "p-4", className)}>
			<TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-fail" strokeWidth={2} />
			<div className="flex min-w-0 flex-1 flex-col gap-1.5">
				<p className="text-sm font-medium text-paper">{error.message}</p>
				<p className="text-sm text-paper-muted">{error.suggestedAction}</p>
				{(onRetry || error.detail) && (
					<div className="mt-1 flex flex-wrap items-center gap-2">
						{onRetry && (
							<Button size="sm" variant="secondary" onClick={onRetry}>
								<RotateCwIcon />
								{retryLabel}
							</Button>
						)}
						{error.detail && (
							<button
								type="button"
								onClick={() => setShowDetail(!showDetail)}
								aria-expanded={showDetail}
								className="flex items-center gap-1 text-xs text-paper-faint transition-colors duration-(--duration-fast) hover:text-paper-muted"
							>
								<ChevronDownIcon className={cn("size-3.5 transition-transform duration-(--duration-fast)", showDetail && "rotate-180")} />
								{showDetail ? "Hide details" : "Show details"}
							</button>
						)}
					</div>
				)}
				{showDetail && error.detail && (
					<pre className="mt-1 max-h-40 overflow-auto rounded-sm bg-ink/70 p-2 font-mono text-2xs whitespace-pre-wrap text-paper-muted select-text">{error.detail}</pre>
				)}
			</div>
		</div>
	);
}
