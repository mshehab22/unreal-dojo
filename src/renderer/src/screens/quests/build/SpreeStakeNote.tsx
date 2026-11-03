// The Build screen's spree line: whether the next Submit is the first try that counts, what a pass makes the spree, and whether armor covers a miss (A1396).
import { ShieldIcon, TargetIcon } from "lucide-react";

import type { SpreeStake } from "@/lib/spreeStake";
import { cn } from "@/lib/utils";

/** Props for SpreeStakeNote. */
interface SpreeStakeNoteProps
{
	readonly stake: SpreeStake;
	readonly armor: number;
}

/** A compact note under Run and Submit. */
export function SpreeStakeNote({ stake, armor }: SpreeStakeNoteProps)
{
	return (
		<div data-testid="spree-stake" data-counts={stake.counts} className={cn("flex flex-col gap-1 rounded-md border px-3 py-2", stake.counts ? "border-pack/50 bg-pack-soft" : "border-line bg-raised/60")}>
			<span className="flex items-center gap-1.5 text-sm font-medium text-paper">
				<TargetIcon className="size-4 shrink-0 text-pack" />
				{stake.headline}
				{armor > 0 && (
					<span className="ml-auto flex shrink-0 items-center gap-1 text-2xs text-paper-faint" title="Spree armor held">
						<ShieldIcon className="size-3.5 text-patterns" />
						{armor}
					</span>
				)}
			</span>
			<span className="text-2xs text-paper-muted">{stake.detail}</span>
		</div>
	);
}
