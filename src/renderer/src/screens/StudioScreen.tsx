// Studio home: the lead programmer, today's drills and streak, the daily quest, what to continue, and the engine room.
import { ScreenHeader } from "@/components/ScreenHeader";
import { AppErrorView } from "@/components/AppErrorView";
import { KeyboardHints } from "@/components/KeyboardHints";
import { LoadingBlock } from "@/components/LoadingBlock";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoQuery } from "@/data/useDojoQuery";
import { modifierKeyLabel } from "@/lib/platform";
import { indexQuests } from "@/lib/questIndex";

import { ContinuePanel } from "./studio/ContinuePanel";
import { DailyOffers } from "./studio/DailyOffers";
import { EngineRoomPanel } from "./studio/EngineRoomPanel";
import { LeadCard } from "./studio/LeadCard";
import { TodayPanel } from "./studio/TodayPanel";

/** The learner's studio home. Every number on it comes through the data layer. */
export function StudioScreen()
{
	const progress = useDojoQuery(QUERY_KEYS.progress, (client) => client.getProgress());
	const rules = useDojoQuery(QUERY_KEYS.rules, (client) => client.getRules());
	const drills = useDojoQuery(QUERY_KEYS.drillSummary, (client) => client.getDrillSummary());
	const daily = useDojoQuery(QUERY_KEYS.daily, (client) => client.getDailyQuest());
	const packs = useDojoQuery(QUERY_KEYS.packs, (client) => client.listPacks());
	const availability = useDojoQuery(QUERY_KEYS.availability, (client) => client.getQuestAvailability());
	const glossary = useDojoQuery(QUERY_KEYS.glossary, (client) => client.getGlossary());

	const firstError = [progress, rules, drills, daily, packs, availability].find((query) => query.error && query.data === undefined);
	const isReady = progress.data && rules.data && drills.data && daily.data && packs.data && availability.data;
	const quests = indexQuests(packs.data ?? []);

	return (
		<section data-testid="screen-studio" className="mx-auto flex w-full max-w-6xl flex-col gap-6">
			<ScreenHeader eyebrow="Studio" title={progress.data?.studio.name || "Studio"} summary="What is due today, what you were in the middle of, and what your studio has shipped." />
			{firstError?.error && <AppErrorView error={firstError.error} onRetry={firstError.reload} />}
			{!firstError && !isReady && <LoadingBlock height="h-96" />}
			{isReady && progress.data && rules.data && drills.data && daily.data && availability.data && (
				<div className="grid grid-cols-12 gap-4">
					<LeadCard progress={progress.data} rules={rules.data} />
					<TodayPanel progress={progress.data} rules={rules.data} drills={drills.data} glossary={glossary.data} />
					<DailyOffers daily={daily.data} quests={quests} rules={rules.data} />
					<ContinuePanel progress={progress.data} availability={availability.data} quests={quests} />
					<EngineRoomPanel progress={progress.data} quests={quests} />
				</div>
			)}
			<KeyboardHints hints={[{ keys: [modifierKeyLabel(), "K"], label: "Search the Codex" }, { keys: ["Esc"], label: "Close a panel" }]} />
		</section>
	);
}
