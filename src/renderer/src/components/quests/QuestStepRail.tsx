// A horizontal step line for multi-step quests (predict, card, questions; plan, compare, result): done steps checked, the current one lit.
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Props for QuestStepRail. */
interface QuestStepRailProps
{
	readonly steps: readonly string[];
	readonly currentIndex: number;
}

/** The steps in a row with numbers. */
export function QuestStepRail({ steps, currentIndex }: QuestStepRailProps)
{
	return (
		<ol data-testid="quest-steps" className="flex flex-wrap items-center gap-x-2 gap-y-2">
			{steps.map((step, index) => (
				<li key={step} aria-current={index === currentIndex ? "step" : undefined} className={cn("flex items-center gap-2 text-sm", index === currentIndex ? "text-paper" : index < currentIndex ? "text-paper-muted" : "text-paper-faint")}>
					<span className={cn("flex size-6 items-center justify-center rounded-pill border font-mono text-2xs", index < currentIndex ? "border-pass bg-pass/15 text-pass" : index === currentIndex ? "border-pack bg-pack-soft text-pack" : "border-line-strong")}>
						{index < currentIndex ? <CheckIcon className="size-3.5" strokeWidth={3} /> : index + 1}
					</span>
					{step}
					{index < steps.length - 1 && <span aria-hidden="true" className="mx-1 h-px w-6 bg-line-strong" />}
				</li>
			))}
		</ol>
	);
}
