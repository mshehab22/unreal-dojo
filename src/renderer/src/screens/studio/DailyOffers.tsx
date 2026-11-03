// The daily quest: up to three offers (drill, concept, short build), one to choose and start, a chest when it is done, and the month so far.
import { ArrowRightIcon, CheckIcon, RepeatIcon } from "lucide-react";

import { useNavigate } from "@/app/router/useRoute";

import type { DailyOffer, DailyQuestState, RulesSnapshot } from "@shared/types/progress";

import { AppErrorView } from "@/components/AppErrorView";
import { Chest } from "@/components/Chest";
import { Panel } from "@/components/Panel";
import { QUEST_KIND_DISPLAY } from "@/components/questKindIcons";
import { Button } from "@/components/ui/button";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoAction } from "@/data/useDojoAction";
import { dailyOfferTarget, monthProgress } from "@/lib/dailyQuestDisplay";
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

/** The chest's caption for the day's state. */
function chestCaption(daily: DailyQuestState): string
{
	if (daily.done) return "Opened today";
	if (daily.chosen === undefined) return "Pick an offer, then finish it to open";

	return "Finish today's pick to open it";
}

/** The offer cards and the day's chest. Picking one keeps it for the day; Start opens it. Missing a day costs nothing. */
export function DailyOffers({ daily, quests, rules }: DailyOffersProps)
{
	const navigate = useNavigate();
	const choose = useDojoAction((client, index: number) => client.chooseDailyOffer(index), [QUERY_KEYS.daily, QUERY_KEYS.progress]);
	const month = monthProgress(daily);

	/** Opens an offer's drill or quest. */
	const start = (offer: DailyOffer): void =>
	{
		const target = dailyOfferTarget(offer);

		if (target) navigate(target.id, target.parameters);
	};

	return (
		<Panel
			title="Daily quest"
			testId="studio-daily"
			className="col-span-12"
			action={<Chest reward={daily.done ? (daily.chest ?? null) : null} caption={chestCaption(daily)} />}
		>
			{daily.offered.length === 0 && <p data-testid="daily-empty" className="text-sm text-paper-muted">No offers today: nothing is due for a drill and no concept or short build is open yet. Open a quest on the World Map; tomorrow brings new offers.</p>}
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
							{isChosen && daily.done && (
								<span data-testid="daily-done" className="flex items-center gap-1.5 text-sm text-pass">
									<CheckIcon className="size-4" />
									Done today
								</span>
							)}
							{isChosen && !daily.done && (
								<Button size="sm" variant="pack" className="self-start" data-testid="daily-start" onClick={() => start(offer)}>
									Start today's pick
									<ArrowRightIcon />
								</Button>
							)}
							{!isChosen && (
								<Button size="sm" variant="secondary" disabled={daily.chosen !== undefined || choose.isPending} onClick={() => void choose.run(index)}>
									Pick this one
								</Button>
							)}
						</article>
					);
				})}
			</div>
			{choose.error && <AppErrorView error={choose.error} compact />}
			<p data-testid="daily-month" className="text-xs text-paper-faint">
				{month.done} of {month.daysInMonth} days of {formatMonth(daily.date.slice(0, 7))} done. Every day of a month earns its badge; a missed day costs nothing.
				{daily.monthBadges.length > 0 && ` Badges: ${daily.monthBadges.map(formatMonth).join(", ")}.`}
			</p>
		</Panel>
	);
}
