// A loot chest: closed while it waits to be earned, open with what it held. Opening is a reward moment, so it may use the slow motion tokens (A98).
import { useEffect, useState } from "react";

import type { ChestReward } from "@shared/types/progress";

import { cn } from "@/lib/utils";

/** Display name of every chest reward. */
export const CHEST_REWARD_LABELS: Readonly<Record<ChestReward, string>> = {
	freeze: "Streak freeze",
	armor: "Spree armor",
	"seer-stone": "Seer Stone",
	"studio-cosmetic": "Studio cosmetic",
	"xp-potion": "XP potion",
};

/** Props for Chest. */
interface ChestProps
{
	readonly reward: ChestReward | null;
	readonly caption: string;
	readonly className?: string;

	/** True when the chest was just earned: it draws closed for two frames, then the lid opens with the reward motion (A1395). */
	readonly opensOnMount?: boolean;
}

/** A chest drawn in SVG with a caption; with a reward it is open and names it. */
export function Chest({ reward, caption, className, opensOnMount = false }: ChestProps)
{
	const [hasOpened, setHasOpened] = useState(!opensOnMount);

	// Two frames, so the closed lid is painted before the transition to open starts.
	useEffect(() =>
	{
		if (hasOpened) return;

		let secondFrame = 0;
		const firstFrame = requestAnimationFrame(() =>
		{
			secondFrame = requestAnimationFrame(() => setHasOpened(true));
		});

		return () =>
		{
			cancelAnimationFrame(firstFrame);
			cancelAnimationFrame(secondFrame);
		};
	}, [hasOpened]);

	const isOpen = reward !== null && hasOpened;

	return (
		<div data-testid="chest" data-open={isOpen} className={cn("flex items-center gap-3", className)}>
			<svg width="44" height="40" viewBox="0 0 44 40" aria-hidden="true" className="shrink-0">
				<rect x="4" y="18" width="36" height="20" rx="3" className={isOpen ? "fill-foundations-soft stroke-foundations" : "fill-raised stroke-line-strong"} strokeWidth="1.5" />
				<g className="origin-[4px_18px] transition-transform duration-(--duration-slow) ease-(--ease-reward)" style={{ transform: isOpen ? "rotate(-24deg)" : "none" }}>
					<path d="M4 18 V12 C4 7 9 4 14 4 H30 C35 4 40 7 40 12 V18 Z" className={isOpen ? "fill-foundations-soft stroke-foundations" : "fill-raised stroke-line-strong"} strokeWidth="1.5" />
				</g>
				<rect x="19" y="15" width="6" height="8" rx="1.5" className={isOpen ? "fill-foundations" : "fill-line-strong"} />
			</svg>
			<div className="flex flex-col leading-tight">
				<span data-testid="chest-reward" className="text-sm font-medium text-paper">{reward ? CHEST_REWARD_LABELS[reward] : "Chest"}</span>
				<span className="text-xs text-paper-faint">{caption}</span>
			</div>
		</div>
	);
}
