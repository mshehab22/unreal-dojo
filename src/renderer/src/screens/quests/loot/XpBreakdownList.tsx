// XP itemized: base, the difficulty multiplier, first pass, spree bonus, hint costs, effort, potion, and the total.
import type { XpBreakdown } from "@shared/types/progress";

import { cn } from "@/lib/utils";

/** Props for XpBreakdownList. */
interface XpBreakdownListProps
{
	readonly xp: XpBreakdown;
}

/** A signed XP amount. */
function signed(amount: number): string
{
	return amount > 0 ? `+${amount}` : String(amount);
}

/** One row per modifier; zero rows other than base and first pass are left out. */
export function XpBreakdownList({ xp }: XpBreakdownListProps)
{
	const rows = [
		{ label: "Quest base", value: `${xp.base}`, always: true },
		{ label: "Difficulty for your level", value: `x${xp.difficultyMultiplier.toFixed(2)}`, always: true },
		{ label: "First pass", value: signed(xp.firstPass), always: true },
		{ label: "Spree bonus", value: signed(xp.spreeBonus), always: xp.spreeBonus !== 0 },
		{ label: "Hint spells", value: signed(xp.hintCost), always: xp.hintCost !== 0 },
		{ label: "Effort (compiled, not passed)", value: signed(xp.effort), always: xp.effort !== 0 },
		{ label: "XP potion", value: signed(xp.potionBonus), always: xp.potionBonus !== 0 },
	].filter((row) => row.always);

	return (
		<dl data-testid="xp-breakdown" className="flex flex-col gap-1.5 text-sm">
			{rows.map((row) => (
				<div key={row.label} className="flex items-baseline justify-between gap-4">
					<dt className="text-paper-muted">{row.label}</dt>
					<dd className={cn("font-mono tabular-nums", row.value.startsWith("-") ? "text-fail" : "text-paper")}>{row.value}</dd>
				</div>
			))}
			<div className="mt-1 flex items-baseline justify-between gap-4 border-t border-line pt-2">
				<dt className="font-medium text-paper">Total</dt>
				<dd data-testid="xp-total" className="font-display text-2xl font-bold text-pack tabular-nums">
					{signed(xp.total)} XP
				</dd>
			</div>
		</dl>
	);
}
