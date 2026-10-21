// Every way the content can ask about each scheduled item: glossary terms, pattern cards, and Parsons blocks, with their topic, skill, and world.
import type { LearnerWorld, PackOutline } from "@shared/types/catalog";
import type { DrillItem, PatternCard, Question } from "@shared/types/content";

import type { DrillCandidate, DrillItemFormat } from "./DrillScheduler";

/** One way to ask about one scheduled item. */
export interface DrillVariant extends DrillCandidate
{
	/** The item as the renderer shows it. */
	item: DrillItem;

	/** The skill the item trains, when its source quest names one. */
	skillId?: string;

	/** The world the item belongs to, for rematch selection. */
	worldId?: string;
}

/** The scheduler key of a Parsons block: it has no glossary or pattern id of its own. */
export function parsonsItemId(questId: string, blockId: string): string
{
	return `parsons.${questId}.${blockId}`;
}

/** The drill format a question is asked in. */
function formatOf(question: Question): DrillItemFormat
{
	if (question.type === "which-pattern") return "pattern-discrimination";
	if (question.type === "explain-in-one-sentence") return "explain";

	return "recall";
}

/**
 * Indexes every drill variant by scheduler key (A310):
 * - a concept question asks about each term of its quest; a which-pattern question asks about its answer pattern;
 * - a pattern card's recall questions ask about the card, its scenarios about their answer pattern;
 * - each Parsons block of a build or refactor quest is its own item.
 * Keys are the raw glossary and pattern ids, so a term and a pattern with the same id share one schedule.
 */
export class DrillItemBank
{
	/** Variants by scheduler key. */
	private readonly variantsByKey = new Map<string, DrillVariant[]>();

	/** Builds the bank from the full worlds (in map order) and the pattern cards. */
	constructor(worlds: LearnerWorld[], patternCards: PatternCard[])
	{
		for (const world of worlds)
		{
			for (const quest of world.quests)
			{
				const skillId = quest.skills[0];
				const base = skillId === undefined ? { worldId: world.id } : { worldId: world.id, skillId };

				if (quest.kind === "concept")
				{
					for (const question of quest.questions)
					{
						const item: DrillItem = { source: "quest-question", questId: quest.id, question };
						const keys = question.type === "which-pattern" ? [question.answer] : quest.terms;

						for (const key of keys) this.add(key, { ...base, itemId: key, format: formatOf(question), topic: world.id, item, contentId: `${quest.id}/${question.id}` });
					}
				}

				if ((quest.kind === "build" || quest.kind === "refactor") && quest.parsons)
				{
					for (const block of quest.parsons)
					{
						const key = parsonsItemId(quest.id, block.id);
						this.add(key, { ...base, itemId: key, format: "parsons", topic: world.id, item: { source: "parsons", questId: quest.id, parsons: block }, contentId: key });
					}
				}
			}
		}

		for (const card of patternCards)
		{
			for (const question of card.recall)
			{
				this.add(card.id, { itemId: card.id, format: formatOf(question), topic: "patterns", item: { source: "pattern-recall", patternId: card.id, question }, contentId: `${card.id}/${question.id}` });
			}

			for (const question of card.scenarios)
			{
				const key = question.type === "which-pattern" ? question.answer : card.id;
				this.add(key, { itemId: key, format: formatOf(question), topic: "patterns", item: { source: "pattern-scenario", patternId: card.id, question }, contentId: `${card.id}/${question.id}` });
			}
		}
	}

	/** Every variant of one key, or an empty list for a key the content cannot ask about. */
	variantsOf(key: string): DrillVariant[]
	{
		return this.variantsByKey.get(key) ?? [];
	}

	/** Every key the bank can ask about. */
	keys(): string[]
	{
		return [...this.variantsByKey.keys()];
	}

	/** Adds one variant. */
	private add(key: string, variant: DrillVariant): void
	{
		const list = this.variantsByKey.get(key) ?? [];
		list.push(variant);
		this.variantsByKey.set(key, list);
	}
}

/** The world ids of every pack, in map order, for loading full worlds. */
export function worldIdsOf(packs: PackOutline[]): string[]
{
	return packs.flatMap((pack) => pack.worlds.map((world) => world.id));
}
