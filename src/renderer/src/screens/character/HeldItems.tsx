// What the learner holds: Seer Stones, spree armor, and streak freezes, each against its cap from the rules.
import { GemIcon, ShieldIcon, SnowflakeIcon, type LucideIcon } from "lucide-react";

import type { PlayerProgress, RulesSnapshot } from "@shared/types/progress";

import { Panel } from "@/components/Panel";

/** Props for HeldItems. */
interface HeldItemsProps
{
	readonly progress: PlayerProgress;
	readonly rules: RulesSnapshot;
}

/** One held item row. */
function ItemRow({ icon: Icon, label, count, cap, note, tone }: { readonly icon: LucideIcon; readonly label: string; readonly count: number; readonly cap?: number; readonly note: string; readonly tone: string })
{
	return (
		<li className="flex items-center gap-3">
			<span className="flex size-9 items-center justify-center rounded-md border border-line bg-raised">
				<Icon className={`size-4 ${count > 0 ? tone : "text-line-strong"}`} strokeWidth={2} />
			</span>
			<span className="flex min-w-0 flex-1 flex-col leading-tight">
				<span className="text-sm text-paper">{label}</span>
				<span className="text-2xs text-paper-faint">{note}</span>
			</span>
			<span className="font-display text-lg font-bold tabular-nums">
				{count}
				{cap !== undefined && <span className="text-sm font-normal text-paper-faint"> / {cap}</span>}
			</span>
		</li>
	);
}

/** Seer Stones, armor, and freezes. */
export function HeldItems({ progress, rules }: HeldItemsProps)
{
	return (
		<Panel title="Held" testId="character-held" className="col-span-4">
			<ul className="flex flex-col gap-3">
				<ItemRow icon={GemIcon} label="Seer Stones" count={progress.seerStones} cap={rules.maxSeerStones} note="View a solution without paying its XP" tone="text-patterns" />
				<ItemRow icon={ShieldIcon} label="Spree armor" count={progress.spree.armor} note="Absorbs one missed first try" tone="text-patterns" />
				<ItemRow icon={SnowflakeIcon} label="Streak freezes" count={progress.streak.freezes} cap={rules.maxFreezes} note={`Covers ${rules.streakWindowDays} more days without activity`} tone="text-mechanics" />
			</ul>
		</Panel>
	);
}
