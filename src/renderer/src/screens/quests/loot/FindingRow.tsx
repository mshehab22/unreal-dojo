// One review finding with a free "Why?" that asks for a plain-English explanation of why it is a finding.
import { HelpCircleIcon } from "lucide-react";
import { useState } from "react";

import type { ReviewFinding } from "@shared/types/review";

import { Button } from "@/components/ui/button";
import { useDojoAction } from "@/data/useDojoAction";

/** Props for FindingRow. */
interface FindingRowProps
{
	readonly finding: ReviewFinding;
	readonly attemptId: string;
	readonly findingIndex: number;
}

/** Title, where it points, detail, and the Why? answer once asked. */
export function FindingRow({ finding, attemptId, findingIndex }: FindingRowProps)
{
	const [explanation, setExplanation] = useState<string | null>(null);
	const explain = useDojoAction((client) => client.explainFinding({ attemptId, findingIndex }));

	/** Asks why, once. */
	const askWhy = async (): Promise<void> =>
	{
		const answer = await explain.run();

		if (answer) setExplanation(answer);
	};

	return (
		<li data-testid="finding" data-severity={finding.severity} className="flex flex-col gap-1.5 rounded-md border border-line bg-raised p-3">
			<div className="flex items-start justify-between gap-3">
				<span className="text-sm font-medium text-paper">
					{finding.title}
					{finding.file && (
						<span className="ml-2 font-mono text-2xs text-paper-faint">
							{finding.file}
							{finding.line ? `:${finding.line}` : ""}
						</span>
					)}
				</span>
				{finding.severity !== "praise" && !explanation && (
					<Button size="sm" variant="ghost" onClick={() => void askWhy()} disabled={explain.isPending} data-testid="finding-why">
						<HelpCircleIcon />
						{explain.isPending ? "Asking" : "Why? (free)"}
					</Button>
				)}
			</div>
			<p className="text-sm text-paper-muted">{finding.detail}</p>
			{explanation && <p data-testid="finding-explanation" className="border-l-2 border-pack pl-3 text-sm text-paper">{explanation}</p>}
			{explain.error && <p className="text-xs text-fail">{explain.error.message}</p>}
		</li>
	);
}
