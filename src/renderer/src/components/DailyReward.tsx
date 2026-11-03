// What finishing today's daily quest paid: the chest opening once with its reward, and the month badge when this was the month's last day (A1395).
import { AwardIcon } from "lucide-react";

import type { ChestReward } from "@shared/types/progress";

import { formatMonth } from "@/lib/formatting";

import { Chest } from "./Chest";

/** Props for DailyReward. */
interface DailyRewardProps
{
	readonly chest: ChestReward | undefined;

	/** The month (YYYY-MM) whose badge this activity earned, if any. */
	readonly monthBadge: string | undefined;
}

/** What each reward does, in one line. */
const REWARD_EFFECTS: Readonly<Record<ChestReward, string>> = {
	freeze: "Keeps your streak alive over a gap.",
	armor: "Absorbs one missed first try on your spree.",
	"seer-stone": "Views a stuck quest's solution without paying its XP.",
	"studio-cosmetic": "A new touch for your studio.",
	"xp-potion": "More XP for a short while.",
};

/** The chest and the badge, or nothing when neither was earned. */
export function DailyReward({ chest, monthBadge }: DailyRewardProps)
{
	if (!chest && !monthBadge) return null;

	return (
		<div data-testid="daily-reward" className="flex flex-col gap-2 rounded-lg border border-line bg-raised/60 p-3">
			{chest && <Chest reward={chest} caption={`Today's daily quest is done. ${REWARD_EFFECTS[chest]}`} opensOnMount />}
			{monthBadge && (
				<p data-testid="month-badge" className="flex items-center gap-2 text-sm text-pack">
					<AwardIcon className="size-4" />
					Every daily quest of {formatMonth(monthBadge)} done: a badge for the month.
				</p>
			)}
		</div>
	);
}
