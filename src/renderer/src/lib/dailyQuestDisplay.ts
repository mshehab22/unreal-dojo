// Pure helpers for the Studio's daily quest (A1394): where a chosen offer opens, and how much of this month's daily quests are done.
import type { DailyOffer, DailyQuestState } from "@shared/types/progress";

import type { RouteId, RouteParameters } from "../app/router/routes";

/** A route to open with its parameters. */
export interface RouteTarget
{
	readonly id: RouteId;
	readonly parameters: RouteParameters;
}

/** Where an offer opens: a drill offer opens today's due drill, a quest offer its quest. Null for a quest offer without a quest. */
export function dailyOfferTarget(offer: DailyOffer): RouteTarget | null
{
	if (offer.kind === "drill") return { id: "drill", parameters: { kind: "due" } };

	return offer.questId ? { id: "quest", parameters: { id: offer.questId } } : null;
}

/** Days of the daily state's month done so far, and how many days the month has. */
export function monthProgress(daily: DailyQuestState): { done: number; daysInMonth: number }
{
	const [year, month] = daily.date.split("-").map(Number);

	if (!year || !month) return { done: 0, daysInMonth: 0 };

	const prefix = daily.date.slice(0, 7);
	const done = new Set(daily.completedDates.filter((day) => day.startsWith(prefix))).size;

	return { done, daysInMonth: new Date(year, month, 0).getDate() };
}
