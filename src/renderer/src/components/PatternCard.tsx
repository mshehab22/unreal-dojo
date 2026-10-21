// A collectible pattern card: front with the intent and tier frame, back with the Unreal form and when not to use it. Locked cards are silhouettes.
import { LockIcon } from "lucide-react";
import { useState } from "react";

import type { PatternCard as PatternCardContent } from "@shared/types/content";
import type { PatternCardTier } from "@shared/types/progress";

import { cn } from "@/lib/utils";

/** Props for PatternCard. */
interface PatternCardProps
{
	readonly card: PatternCardContent;
	readonly tier: PatternCardTier | null;
	readonly useCasesPassed: number;
	readonly tierThresholds: Readonly<Record<PatternCardTier, number>>;
}

/** Frame color of each tier. */
const TIER_FRAME: Readonly<Record<PatternCardTier, string>> = {
	bronze: "border-tier-bronze",
	silver: "border-tier-silver",
	gold: "border-tier-gold",
};

/** Text color of each tier's label. */
const TIER_TEXT: Readonly<Record<PatternCardTier, string>> = {
	bronze: "text-tier-bronze",
	silver: "text-tier-silver",
	gold: "text-tier-gold",
};

/** The tier after this one, or null at gold. */
function nextTier(tier: PatternCardTier): PatternCardTier | null
{
	return tier === "bronze" ? "silver" : tier === "silver" ? "gold" : null;
}

/** One card in the Character grid. Click an earned card to turn it over. */
export function PatternCard({ card, tier, useCasesPassed, tierThresholds }: PatternCardProps)
{
	const [showBack, setShowBack] = useState(false);

	if (!tier)
	{
		return (
			<div data-testid="pattern-card" data-locked="true" className="flex aspect-[5/7] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line-strong bg-surface/40 p-3 text-center">
				<LockIcon className="size-5 text-line-strong" strokeWidth={1.75} />
				<span className="text-xs text-paper-faint">{card.title}</span>
			</div>
		);
	}

	const upcoming = nextTier(tier);

	return (
		<button
			type="button"
			data-testid="pattern-card"
			data-tier={tier}
			aria-pressed={showBack}
			onClick={() => setShowBack(!showBack)}
			className={cn(
				"flex aspect-[5/7] flex-col gap-2 overflow-hidden rounded-lg border-2 bg-raised p-3 text-left transition-colors duration-(--duration-fast) hover:bg-overlay",
				TIER_FRAME[tier],
			)}
		>
			<div className="flex items-center justify-between">
				<span className={cn("font-mono text-2xs tracking-widest uppercase", TIER_TEXT[tier])}>{tier}</span>
			</div>
			<h3 className="font-display text-base leading-tight font-semibold">{card.title}</h3>
			{showBack ? (
				<div className="flex flex-col gap-2 text-2xs leading-snug text-paper-muted">
					<p className="line-clamp-4">{card.unrealForm}</p>
					<p className="line-clamp-3 text-paper-faint">Not when: {card.whenNot}</p>
				</div>
			) : (
				<p className="line-clamp-5 text-xs leading-snug text-paper-muted">{card.intent}</p>
			)}
			<span aria-hidden="true" className="flex-1" />
			<div className="text-2xs text-paper-faint tabular-nums">
				{useCasesPassed} use case{useCasesPassed === 1 ? "" : "s"}
				{upcoming ? `, ${upcoming} at ${tierThresholds[upcoming]}` : ", top tier"}
			</div>
		</button>
	);
}
