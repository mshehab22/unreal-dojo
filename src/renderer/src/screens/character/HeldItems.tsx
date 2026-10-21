// What the learner holds: Seer Stones, spree armor, and streak freezes, each against its cap from the rules.
import { GemIcon, ShieldIcon, SnowflakeIcon } from "lucide-react";

import type { PlayerProgress, RulesSnapshot } from "@shared/types/progress";

import { Panel } from "@/components/Panel";

import { HeldItemRow } from "./HeldItemRow";

/** Props for HeldItems. */
interface HeldItemsProps
{
	readonly progress: PlayerProgress;
	readonly rules: RulesSnapshot;
}

/** Seer Stones, armor, and freezes. */
export function HeldItems({ progress, rules }: HeldItemsProps)
{
	return (
		<Panel title="Held" testId="character-held" className="col-span-4">
			<ul className="flex flex-col gap-3">
				<HeldItemRow icon={GemIcon} label="Seer Stones" count={progress.seerStones} cap={rules.maxSeerStones} note="View a solution without paying its XP" tone="text-patterns" />
				<HeldItemRow icon={ShieldIcon} label="Spree armor" count={progress.spree.armor} note="Absorbs one missed first try" tone="text-patterns" />
				<HeldItemRow icon={SnowflakeIcon} label="Streak freezes" count={progress.streak.freezes} cap={rules.maxFreezes} note={`Covers ${rules.streakWindowDays} more days without activity`} tone="text-mechanics" />
			</ul>
		</Panel>
	);
}
