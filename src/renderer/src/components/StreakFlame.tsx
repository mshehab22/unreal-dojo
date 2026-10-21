// The activity streak: a flame with the count, freezes held, and the next milestone. No guilt copy, ever.
import { SnowflakeIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Props for StreakFlame. */
interface StreakFlameProps
{
	readonly count: number;
	readonly freezes: number;
	readonly maxFreezes: number;
	readonly milestones: readonly number[];
	readonly windowDays: number;
	readonly className?: string;
}

/** Flame lit when the streak is alive, with freezes as snowflakes and the next milestone. */
export function StreakFlame({ count, freezes, maxFreezes, milestones, windowDays, className }: StreakFlameProps)
{
	const isLit = count > 0;
	const nextMilestone = milestones.find((milestone) => milestone > count);

	return (
		<div data-testid="streak-flame" className={cn("flex items-center gap-4", className)}>
			<svg width="36" height="44" viewBox="0 0 36 44" aria-hidden="true" className="shrink-0">
				<path
					d="M18 2 C22 10 32 15 32 27 C32 36 25.5 42 18 42 C10.5 42 4 36 4 27 C4 20 8 15 11 12 C11 18 13 21 16 22 C14 14 15 8 18 2 Z"
					className={isLit ? "fill-foundations" : "fill-raised stroke-line-strong"}
					strokeWidth="1.5"
				/>
				<path d="M18 24 C21 28 24 30 24 34 C24 38 21 40 18 40 C15 40 12 38 12 34 C12 31 15 28 18 24 Z" className={isLit ? "fill-warn" : "fill-transparent"} />
			</svg>
			<div className="flex flex-col gap-1">
				<div className="flex items-baseline gap-2">
					<span className="font-display text-3xl leading-none font-bold tabular-nums">{count}</span>
					<span className="text-sm text-paper-muted">streak</span>
				</div>
				<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-paper-faint">
					<span className="flex shrink-0 items-center gap-1" title={`Freezes held (at most ${maxFreezes})`}>
						{Array.from({ length: maxFreezes }, (_unused, index) => (
							<SnowflakeIcon key={index} className={cn("size-3.5", index < freezes ? "text-mechanics" : "text-line-strong")} strokeWidth={2} />
						))}
						<span className="ml-0.5">
							{freezes} of {maxFreezes}
						</span>
					</span>
					<span>{nextMilestone ? `Next milestone ${nextMilestone}` : "Every milestone reached"}</span>
				</div>
				<div className="text-2xs text-paper-faint">A drill or a passed quest within any {windowDays} days keeps it.</div>
			</div>
		</div>
	);
}
