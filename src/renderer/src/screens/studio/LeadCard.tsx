// The Studio's lead programmer card: portrait, name, role, the XP bar, and an XP potion while one is active.
import { FlaskConicalIcon } from "lucide-react";

import type { PlayerProgress, RulesSnapshot } from "@shared/types/progress";

import { Panel } from "@/components/Panel";
import { RoleBadge } from "@/components/RoleBadge";
import { StudioPortrait } from "@/components/StudioPortrait";
import { XpBar } from "@/components/XpBar";
import { levelStanding } from "@/lib/levels";

/** Props for LeadCard. */
interface LeadCardProps
{
	readonly progress: PlayerProgress;
	readonly rules: RulesSnapshot;
}

/** The learner as the studio's lead programmer. */
export function LeadCard({ progress, rules }: LeadCardProps)
{
	const standing = levelStanding(progress.xp, rules);
	const stats: readonly [string, number][] = [
		["Quests passed", Object.values(progress.quests).filter((quest) => quest.status === "passed").length],
		["Pattern cards", Object.keys(progress.patternCards).length],
		["Skills mastered", Object.values(progress.skills).filter((skill) => skill.mastery === "mastered").length],
		["Best spree", progress.spree.best],
	];

	return (
		<Panel title="Lead programmer" testId="studio-lead" className="col-span-7">
			<div className="flex items-center gap-4">
				<StudioPortrait role="lead" size={64} />
				<div className="flex min-w-0 flex-col gap-2">
					<span className="truncate font-display text-2xl font-bold tracking-tight">{progress.playerName || "Lead programmer"}</span>
					<RoleBadge role={standing.role} level={standing.level} nextRole={standing.nextRole} />
				</div>
			</div>
			<XpBar standing={standing} totalXp={progress.xp} />
			{progress.xpPotionUntil !== null && new Date(progress.xpPotionUntil).getTime() > Date.now() && (
				<p data-testid="xp-potion" className="flex items-center gap-2 text-sm text-pack">
					<FlaskConicalIcon className="size-4" />
					XP potion: +{Math.round(rules.xpPotion.share * 100)}% XP until {new Date(progress.xpPotionUntil).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
				</p>
			)}
			<dl data-testid="lead-stats" className="mt-auto grid grid-cols-4 gap-2 border-t border-line pt-4">
				{stats.map(([label, value]) => (
					<div key={label} className="flex flex-col-reverse gap-0.5">
						<dt className="text-2xs text-paper-faint">{label}</dt>
						<dd className="font-display text-2xl font-bold tabular-nums">{value}</dd>
					</div>
				))}
			</dl>
		</Panel>
	);
}
