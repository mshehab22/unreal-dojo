// First-run's step list: done steps checked, the current one in the accent, the rest waiting.
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { FIRST_RUN_STEPS, type FirstRunStepId } from "./firstRunSteps";

/** Props for StepRail. */
interface StepRailProps
{
	readonly current: FirstRunStepId;
}

/** The vertical list of setup steps. */
export function StepRail({ current }: StepRailProps)
{
	const currentIndex = FIRST_RUN_STEPS.findIndex((step) => step.id === current);

	return (
		<ol data-testid="first-run-steps" className="flex flex-col gap-1">
			{FIRST_RUN_STEPS.map((step, index) => (
				<li
					key={step.id}
					aria-current={index === currentIndex ? "step" : undefined}
					className={cn("flex h-10 items-center gap-3 rounded-md px-3 text-sm", index === currentIndex ? "bg-raised text-paper" : index < currentIndex ? "text-paper-muted" : "text-paper-faint")}
				>
					<span
						className={cn(
							"flex size-6 shrink-0 items-center justify-center rounded-pill border font-mono text-2xs",
							index < currentIndex ? "border-pass bg-pass/15 text-pass" : index === currentIndex ? "border-pack bg-pack-soft text-pack" : "border-line-strong",
						)}
					>
						{index < currentIndex ? <CheckIcon className="size-3.5" strokeWidth={3} /> : index + 1}
					</span>
					{step.label}
				</li>
			))}
		</ol>
	);
}
