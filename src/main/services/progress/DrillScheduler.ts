// Picks what is due today (cap 20, overflow slides), puts hovered terms and "Drill me" items first, and composes one 6 to 10 item drill.
import type { DrillSummary, PlayerProgress } from "@shared/types/progress";

import { endOfLocalDay } from "./calendarDays";
import { MasteryRules } from "./MasteryRules";
import type { RandomSource } from "./RandomSource";
import { DAILY_DUE_CAP, DRILL_SIZE, HOVER_INJECTION_THRESHOLD } from "./rules";

/** How a drill item is asked. Pattern discrimination is a which-pattern scenario. */
export type DrillItemFormat = "recall" | "pattern-discrimination" | "parsons" | "explain";

/** The formats every drill must hold at least one of. */
export const REQUIRED_DRILL_FORMATS: DrillItemFormat[] = ["pattern-discrimination", "parsons", "explain"];

/** One item a drill could hold. The content layer builds these from glossary terms, pattern cards, Parsons blocks, and scenarios. */
export interface DrillCandidate
{
	/** The review item id (the scheduler key). */
	itemId: string;

	/** How the item is asked. */
	format: DrillItemFormat;

	/** The topic (skill prefix or world) used to mix items across topics. */
	topic: string;
}

/** Due-today rules and drill composition. Pure: time and randomness come in as arguments. */
export class DrillScheduler
{
	/** Reads mastery for the hover injection rule. */
	private readonly mastery = new MasteryRules();

	/** Builds the Studio home summary: due today capped at 20, the overflow that slides to tomorrow, and the next due time. */
	summary(progress: PlayerProgress, now: Date): DrillSummary
	{
		const due = this.allDueIds(progress, now);
		const nextDueAt = Object.values(progress.schedule).sort()[0] ?? null;

		return { dueToday: Math.min(DAILY_DUE_CAP, due.length), overflow: Math.max(0, due.length - DAILY_DUE_CAP), nextDueAt };
	}

	/** Today's due items in priority order, capped at 20: "Drill me" items, then terms hovered 3+ times that are not yet familiar, then scheduled items oldest due first. */
	dueToday(progress: PlayerProgress, now: Date): string[]
	{
		return this.allDueIds(progress, now).slice(0, DAILY_DUE_CAP);
	}

	/** Terms hovered at least 3 times that the learner has not reached familiar on. */
	hoveredTermsToInject(progress: PlayerProgress): string[]
	{
		return Object.entries(progress.hoverCounts)
			.filter(([termId, count]) => count >= HOVER_INJECTION_THRESHOLD && !this.mastery.isAtLeast(progress.memory[termId]?.mastery, "familiar"))
			.sort(([leftId, leftCount], [rightId, rightCount]) => rightCount - leftCount || leftId.localeCompare(rightId))
			.map(([termId]) => termId);
	}

	/**
	 * Composes one drill from candidates in priority order (due first) and a pool of extra items (not due) used only to fill
	 * a required format or the minimum size. Holds 6 to 10 items, at least one of each required format when any exists,
	 * mixed across topics, in a shuffled order.
	 */
	compose(priority: DrillCandidate[], pool: DrillCandidate[], random: RandomSource): DrillCandidate[]
	{
		const chosen: DrillCandidate[] = [];
		const chosenIds = new Set<string>();
		const take = (candidate: DrillCandidate): void =>
		{
			chosen.push(candidate);
			chosenIds.add(candidate.itemId);
		};

		for (const format of REQUIRED_DRILL_FORMATS)
		{
			const fromPriority = priority.find((candidate) => candidate.format === format && !chosenIds.has(candidate.itemId));
			const poolOfFormat = pool.filter((candidate) => candidate.format === format && !chosenIds.has(candidate.itemId));
			const pick = fromPriority ?? this.pickRandom(poolOfFormat, random);

			if (pick) take(pick);
		}

		for (const candidate of this.interleaveByTopic(priority.filter((candidate) => !chosenIds.has(candidate.itemId))))
		{
			if (chosen.length >= DRILL_SIZE.max) break;
			take(candidate);
		}

		while (chosen.length < DRILL_SIZE.min)
		{
			const pick = this.pickRandom(pool.filter((candidate) => !chosenIds.has(candidate.itemId)), random);
			if (!pick) break;
			take(pick);
		}

		return this.shuffle(chosen, random);
	}

	/** Items whose scheduled due time falls by the end of today, oldest first. Only these can surface a rematch: "Drill me" and hover-injected items never do. */
	scheduledDueToday(progress: PlayerProgress, now: Date): string[]
	{
		const endOfToday = endOfLocalDay(now).getTime();

		return Object.entries(progress.schedule)
			.filter(([, dueAt]) => new Date(dueAt).getTime() <= endOfToday)
			.sort(([leftId, leftDue], [rightId, rightDue]) => leftDue.localeCompare(rightDue) || leftId.localeCompare(rightId))
			.map(([itemId]) => itemId);
	}

	/** Every due item id in priority order, without the cap. */
	private allDueIds(progress: PlayerProgress, now: Date): string[]
	{
		const ordered: string[] = [];
		const seen = new Set<string>();
		const add = (itemId: string): void =>
		{
			if (seen.has(itemId)) return;
			seen.add(itemId);
			ordered.push(itemId);
		};

		progress.drillQueue.forEach(add);
		this.hoveredTermsToInject(progress).forEach(add);
		this.scheduledDueToday(progress, now).forEach(add);

		return ordered;
	}

	/** Round-robin across topics in order of first appearance, keeping each topic's own order. */
	private interleaveByTopic(candidates: DrillCandidate[]): DrillCandidate[]
	{
		const byTopic = new Map<string, DrillCandidate[]>();

		for (const candidate of candidates)
		{
			const list = byTopic.get(candidate.topic) ?? [];
			list.push(candidate);
			byTopic.set(candidate.topic, list);
		}

		const queues = [...byTopic.values()];
		const interleaved: DrillCandidate[] = [];

		while (queues.some((queue) => queue.length > 0))
		{
			for (const queue of queues)
			{
				const next = queue.shift();
				if (next) interleaved.push(next);
			}
		}

		return interleaved;
	}

	/** One random element, or undefined for an empty list. */
	private pickRandom<Item>(items: Item[], random: RandomSource): Item | undefined
	{
		if (items.length === 0) return undefined;

		return items[Math.floor(random.next() * items.length)];
	}

	/** A Fisher-Yates shuffled copy. */
	private shuffle<Item>(items: Item[], random: RandomSource): Item[]
	{
		const shuffled = [...items];

		for (let index = shuffled.length - 1; index > 0; index--)
		{
			const swapIndex = Math.floor(random.next() * (index + 1));
			const held = shuffled[index] as Item;
			shuffled[index] = shuffled[swapIndex] as Item;
			shuffled[swapIndex] = held;
		}

		return shuffled;
	}
}
