// The key to the World Map's stage states, drawn with the same shapes as the stages.
import { CheckIcon, LockIcon, RotateCcwIcon } from "lucide-react";

/** One sample node and its meaning per state. */
export function MapLegend()
{
	const node = "flex size-5 items-center justify-center rounded-pill border-2";

	return (
		<div data-testid="map-legend" className="flex flex-wrap items-center gap-5 text-xs text-paper-faint">
			<span className="flex items-center gap-2">
				<span className={`${node} border-dashed border-line-strong`}>
					<LockIcon className="size-2.5" />
				</span>
				Locked
			</span>
			<span className="flex items-center gap-2">
				<span className={`${node} border-pack bg-surface`} />
				Open
			</span>
			<span className="flex items-center gap-2">
				<span className={`${node} border-[3px] border-pack bg-surface`}>
					<span className="size-1.5 rounded-pill bg-pack" />
				</span>
				In progress
			</span>
			<span className="flex items-center gap-2">
				<span className={`${node} border-pack bg-pack text-pack-deep`}>
					<CheckIcon className="size-2.5" strokeWidth={3} />
				</span>
				Passed
			</span>
			<span className="flex items-center gap-2">
				<span className={`${node} border-warn bg-warn/15 text-warn shadow-[0_0_10px_-1px_var(--color-warn)]`}>
					<RotateCcwIcon className="size-2.5" strokeWidth={3} />
				</span>
				Rematch due
			</span>
			<span>The large node at the end of each path is the boss.</span>
		</div>
	);
}
