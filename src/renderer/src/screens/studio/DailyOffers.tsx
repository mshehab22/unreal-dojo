// The daily quest: three offers (drill, concept, short build), one to choose, a chest when it is done.
import { CheckIcon, RepeatIcon } from "lucide-react";

import type { DailyOffer, DailyQuestState, RulesSnapshot } from "@shared/types/progress";

import { AppErrorView } from "@/components/AppErrorView";
import { Chest } from "@/components/Chest";
import { Panel } from "@/components/Panel";
import { QUEST_KIND_DISPLAY } from "@/components/questKindIcons";
import { Button } from "@/components/ui/button";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoAction } from "@/data/useDojoAction";
import { formatMonth } from "@/lib/formatting";
import type { QuestLocation } from "@/lib/questIndex";
import { cn } from "@/lib/utils";

/** Props for DailyOffers. */
interface DailyOffersProps
{
	readonly daily: DailyQuestState;
	readonly quests: ReadonlyMap<string, QuestLocation>;
	readonly rules: RulesSnapshot;
}

/** The title and one line for an offer. */
function describeOffer(offer: DailyOffer, quests: ReadonlyMap<string, QuestLocation>, rules: RulesSnapshot): { title: string; detail: string }
{
	if (offer.kind === "drill") return { title: "A short drill", detail: `${rules.drillSize.min} to ${rules.drillSize.max} due items, mixed. Keeps the streak on its own.` };

	const location = offer.questId ? quests.get(offer.questId) : undefined;

	if (!location) return { title: offer.kind === "build" ? "A short build" : "A concept card", detail: "Picked from what you can open." };

	return { title: location.quest.title, detail: `${location.world.title}, about ${location.quest.estimatedMinutes} min` };
}

/** Three offer cards and the day's chest. Missing a day costs nothing. */
export function DailyOffers({ daily, quests, rules }: DailyOffersProps)
{
	const choose = useDojoAction((client, index: number) => client.chooseDailyOffer(index), [QUERY_KEYS.daily, QUERY_KEYS.progress]);

	return (
		<Panel
			title="Daily quest"
			testId="studio-daily"
			className="col-span-12"
			action={<Chest reward={null} caption={daily.done ? "Opened today" : "Finish today's pick to open it"} />}
		>
			<div className="grid grid-cols-3 gap-3">
				{daily.offered.map((offer, index) =>
				{
					const { title, detail } = describeOffer(offer, quests, rules);
					const Icon = offer.kind === "drill" ? RepeatIcon : QUEST_KIND_DISPLAY[offer.kind].icon;
					const isChosen = daily.chosen === index;
					const isOther = daily.chosen !== undefined && !isChosen;

					return (
						<article
							key={`${offer.kind}-${index}`}
							data-testid="daily-offer"
							data-chosen={isChosen}
							className={cn("flex flex-col gap-3 rounded-lg border p-4", isChosen ? "border-pack bg-pack-soft" : "border-line bg-raised/60", isOther && "opacity-50")}
						>
							<span className="flex items-center gap-2 font-mono text-2xs tracking-widest text-pack uppercase">
								<Icon className="size-3.5" strokeWidth={2} />
								{offer.kind}
							</span>
							<div className="flex min-h-14 flex-col gap-1">
								<h3 className="font-display text-base leading-snug font-semibold">{title}</h3>
								<p className="text-xs text-paper-faint">{detail}</p>
							</div>
							{isChosen ? (
								<span className="flex items-center gap-1.5 text-sm text-pack">
									<CheckIcon className="size-4" />
									Today's pick
								</span>
							) : (
								<Button size="sm" variant="secondary" disabled={daily.chosen !== undefined || choose.isPending} onClick={() => void choose.run(index)}>
									Pick this one
								</Button>
							)}
						</article>
					);
				})}
			</div>
			{choose.error && <AppErrorView error={choose.error} compact />}
			{daily.monthBadges.length > 0 && <p className="text-xs text-paper-faint">Every daily quest done in {daily.monthBadges.map(formatMonth).join(", ")}</p>}
		</Panel>
	);
}
