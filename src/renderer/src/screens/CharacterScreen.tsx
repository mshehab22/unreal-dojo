// Character: level and role, XP, spree, streak, held items, pattern cards, the skill tree, and attempt history.
import { AppErrorView } from "@/components/AppErrorView";
import { LoadingBlock } from "@/components/LoadingBlock";
import { Panel } from "@/components/Panel";
import { RoleBadge } from "@/components/RoleBadge";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SkillTree } from "@/components/SkillTree";
import { SpreeMeter } from "@/components/SpreeMeter";
import { XpBar } from "@/components/XpBar";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoQuery } from "@/data/useDojoQuery";
import { levelStanding } from "@/lib/levels";
import { indexQuests } from "@/lib/questIndex";
import { groupSkills } from "@/lib/skillGroups";

import { AttemptHistory } from "./character/AttemptHistory";
import { HeldItems } from "./character/HeldItems";
import { PatternCardGrid } from "./character/PatternCardGrid";
import { StreakMilestones } from "./character/StreakMilestones";

/** Who the learner is as a programmer so far. */
export function CharacterScreen()
{
	const progress = useDojoQuery(QUERY_KEYS.progress, (client) => client.getProgress());
	const rules = useDojoQuery(QUERY_KEYS.rules, (client) => client.getRules());
	const cards = useDojoQuery(QUERY_KEYS.patternCards, (client) => client.getPatternCards());
	const packs = useDojoQuery(QUERY_KEYS.packs, (client) => client.listPacks());

	const firstError = [progress, rules, cards, packs].find((query) => query.error && query.data === undefined);

	return (
		<section data-testid="screen-character" className="mx-auto flex w-full max-w-6xl flex-col gap-6">
			<ScreenHeader eyebrow="Character" title="Character" summary="Two meters: XP measures effort and only rises; mastery shows what has stuck and comes back with review." />
			{firstError?.error && <AppErrorView error={firstError.error} onRetry={firstError.reload} />}
			{!firstError && !(progress.data && rules.data && cards.data && packs.data) && <LoadingBlock height="h-96" />}
			{progress.data && rules.data && cards.data && packs.data && (() =>
			{
				const standing = levelStanding(progress.data.xp, rules.data);

				return (
					<div className="grid grid-cols-12 gap-4">
						<Panel title="Level and role" testId="character-level" className="col-span-4">
							<RoleBadge role={standing.role} level={standing.level} nextRole={standing.nextRole} />
							<XpBar standing={standing} totalXp={progress.data.xp} size="sm" />
						</Panel>
						<Panel title="Sharpshooter spree" testId="character-spree" className="col-span-4">
							<SpreeMeter current={progress.data.spree.current} best={progress.data.spree.best} armor={progress.data.spree.armor} bonusThreshold={rules.data.spreeBonusThreshold} />
							<p className="text-2xs text-paper-faint">Only Submit counts. Run is always free, and a spree once earned is never taken away.</p>
						</Panel>
						<StreakMilestones progress={progress.data} rules={rules.data} />
						<HeldItems progress={progress.data} rules={rules.data} />
						<Panel title="Skill tree" testId="character-skills" className="col-span-8">
							<SkillTree groups={groupSkills(progress.data.skills)} />
						</Panel>
						<PatternCardGrid cards={cards.data} progress={progress.data} rules={rules.data} />
						<AttemptHistory attempts={progress.data.attempts} quests={indexQuests(packs.data)} />
					</div>
				);
			})()}
		</section>
	);
}
