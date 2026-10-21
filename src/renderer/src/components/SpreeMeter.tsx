// The Sharpshooter spree: first-try Submit passes in a row, pips up to the bonus threshold, best run, and armor held.
import { ShieldIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Props for SpreeMeter. */
interface SpreeMeterProps
{
	readonly current: number;
	readonly best: number;
	readonly armor: number;
	readonly bonusThreshold: number;
	readonly className?: string;
}

/** Pips fill toward the bonus threshold; past it the meter says the bonus is on. Run never counts, so nothing here can drop on a Run. */
export function SpreeMeter({ current, best, armor, bonusThreshold, className }: SpreeMeterProps)
{
	const pipCount = Math.max(bonusThreshold, current);
	const bonusOn = current >= bonusThreshold;

	return (
		<div data-testid="spree-meter" className={cn("flex flex-col gap-2", className)}>
			<div className="flex items-baseline justify-between gap-3">
				<div className="flex items-baseline gap-2">
					<span className="font-display text-3xl leading-none font-bold tabular-nums">{current}</span>
					<span className="text-sm text-paper-muted">first-try passes</span>
				</div>
				<span className="shrink-0 font-mono text-2xs text-paper-faint">BEST {best}</span>
			</div>
			<div className="flex gap-1" aria-hidden="true">
				{Array.from({ length: pipCount }, (_unused, index) => (
					<span key={index} className={cn("h-1.5 flex-1 rounded-pill", index < current ? "bg-pack" : "bg-raised", index === bonusThreshold - 1 && "ring-1 ring-pack/50")} />
				))}
			</div>
			<div className="flex items-center justify-between text-xs text-paper-faint">
				<span>{bonusOn ? "Spree bonus is on" : `Bonus at ${bonusThreshold}`}</span>
				<span className="flex items-center gap-1" title="Armor absorbs one missed first try">
					<ShieldIcon className={cn("size-3.5", armor > 0 ? "text-patterns" : "text-line-strong")} strokeWidth={2} />
					{armor} armor
				</span>
			</div>
		</div>
	);
}
