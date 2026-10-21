// The XP bar: level, XP into the level, and how much the next level needs. XP only rises, so the bar never shows a loss.
import type { LevelStanding } from "@/lib/levels";
import { cn } from "@/lib/utils";

/** Props for XpBar. */
interface XpBarProps
{
	readonly standing: LevelStanding;
	readonly totalXp: number;
	readonly size?: "sm" | "md";
	readonly className?: string;
}

/** A thin bar in the current pack accent with the level and XP numbers around it. */
export function XpBar({ standing, totalXp, size = "md", className }: XpBarProps)
{
	const share = standing.xpForNextLevel > 0 ? Math.min(1, standing.xpIntoLevel / standing.xpForNextLevel) : 0;

	return (
		<div data-testid="xp-bar" className={cn("flex flex-col gap-1.5", className)}>
			<div className="flex items-baseline justify-between gap-3">
				<span className={cn("font-display font-bold tracking-tight", size === "md" ? "text-xl" : "text-base")}>Level {standing.level}</span>
				<span className="font-mono text-2xs text-paper-faint tabular-nums">
					{standing.xpIntoLevel} / {standing.xpForNextLevel} XP
				</span>
			</div>
			<div
				role="progressbar"
				aria-label="XP toward the next level"
				aria-valuemin={0}
				aria-valuemax={standing.xpForNextLevel}
				aria-valuenow={standing.xpIntoLevel}
				className={cn("overflow-hidden rounded-pill bg-raised", size === "md" ? "h-2" : "h-1.5")}
			>
				<div className="h-full rounded-pill bg-pack" style={{ width: `${Math.round(share * 100)}%` }} />
			</div>
			<div className="font-mono text-2xs text-paper-faint tabular-nums">{totalXp.toLocaleString("en-US")} XP total</div>
		</div>
	);
}
