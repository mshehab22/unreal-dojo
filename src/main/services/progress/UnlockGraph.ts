// The prerequisite graph of the World Map: which quests are available, and why the rest are locked.
import type { MasteryLevel, PlayerProgress, QuestAvailability } from "@shared/types/progress";

import { MasteryRules } from "./MasteryRules";
import type { RuleQuest } from "./RuleQuest";
import { PACK_GATES } from "./rules";
import { TestOutRules } from "./TestOutRules";

/** The learner state the graph reads. */
export interface UnlockState
{
	/** The moment availability is judged at (a rematch counts once its due time has come). */
	now: Date;

	/** Quest progress by quest id. */
	quests: PlayerProgress["quests"];

	/** Item mastery by item id (terms are items). */
	masteryOf: (itemId: string) => MasteryLevel | null | undefined;

	/** Worlds the learner tested out of. */
	testedOutWorldIds: string[];

	/** Rematch due times by quest id. */
	rematches: Record<string, string>;
}

/** Unlock rules. Pure: no I/O. Built once per content load. */
export class UnlockGraph
{
	/** Compares mastery levels. */
	private readonly mastery = new MasteryRules();

	/** Decides which quests test-out lets the learner skip. */
	private readonly testOut = new TestOutRules();

	/** Every quest by id. */
	private readonly questsById: Map<string, RuleQuest>;

	/** The first quest of each pack's first world. */
	private readonly alwaysAvailableIds: Set<string>;

	/** Boss quest ids each pack (by id) waits for. */
	private readonly packGateBossIds: Map<string, string[]>;

	/** Builds the graph from every loaded quest. */
	constructor(private readonly quests: RuleQuest[])
	{
		this.questsById = new Map(quests.map((quest) => [quest.id, quest]));
		this.alwaysAvailableIds = this.findAlwaysAvailable();
		this.packGateBossIds = this.findPackGates();
	}

	/** Availability of every quest. */
	availability(state: UnlockState): Record<string, QuestAvailability>
	{
		const result: Record<string, QuestAvailability> = {};

		for (const quest of this.quests)
		{
			result[quest.id] = this.availabilityOf(quest, state);
		}

		return result;
	}

	/** Quest ids that were locked before and are not locked after. */
	newlyUnlocked(before: UnlockState, after: UnlockState): string[]
	{
		const previous = this.availability(before);
		const next = this.availability(after);

		return this.quests
			.filter((quest) => previous[quest.id]?.status === "locked" && next[quest.id]?.status !== "locked")
			.map((quest) => quest.id);
	}

	/** Availability of one quest: a stored passed or in-progress status wins once the quest is open; otherwise every gate is checked in order. */
	private availabilityOf(quest: RuleQuest, state: UnlockState): QuestAvailability
	{
		const stored = state.quests[quest.id]?.status;
		const testedOut = state.testedOutWorldIds.includes(quest.worldId);
		const rematchDueAt = state.rematches[quest.id];
		const dueForRematch = rematchDueAt !== undefined && new Date(rematchDueAt).getTime() <= state.now.getTime();
		const base = { dueForRematch, skippable: testedOut && this.testOut.isSkippable(quest) };

		if (stored === "passed") return { status: "passed", ...base };

		const lockedReason = this.lockedReason(quest, state, testedOut);
		if (lockedReason) return { status: "locked", lockedReason, ...base };

		return { status: stored === "in_progress" ? "in_progress" : "available", ...base };
	}

	/** Why a quest is locked, or null when it is open. Pack gate first, then prerequisites, then terms. */
	private lockedReason(quest: RuleQuest, state: UnlockState, testedOut: boolean): string | null
	{
		const gateBosses = (this.packGateBossIds.get(quest.packId) ?? []).filter((bossId) => state.quests[bossId]?.status !== "passed");
		if (gateBosses.length > 0) return `Beat ${this.joinTitles(gateBosses)} first.`;

		if (this.alwaysAvailableIds.has(quest.id)) return null;

		const missingPrerequisites = quest.prerequisites.filter((prerequisiteId) => !this.prerequisiteMet(prerequisiteId, state));
		if (missingPrerequisites.length > 0) return `Pass ${this.joinTitles(missingPrerequisites)} first.`;

		if (testedOut) return null;

		const weakTerms = quest.terms.filter((termId) => !this.mastery.isAtLeast(state.masteryOf(termId), "familiar"));
		if (weakTerms.length > 0) return `Get ${this.joinList(weakTerms)} to Familiar in a drill first.`;

		return null;
	}

	/** A prerequisite is met when passed, or when it is a skippable quest in a tested-out world. */
	private prerequisiteMet(prerequisiteId: string, state: UnlockState): boolean
	{
		if (state.quests[prerequisiteId]?.status === "passed") return true;

		const prerequisite = this.questsById.get(prerequisiteId);
		if (!prerequisite) return false;

		return state.testedOutWorldIds.includes(prerequisite.worldId) && this.testOut.isSkippable(prerequisite);
	}

	/** The lowest-order quest of the lowest-order world of every pack. */
	private findAlwaysAvailable(): Set<string>
	{
		const firstByPack = new Map<string, RuleQuest>();

		for (const quest of this.quests)
		{
			const current = firstByPack.get(quest.packId);
			const earlier = !current || quest.worldOrder < current.worldOrder || (quest.worldOrder === current.worldOrder && quest.order < current.order);

			if (earlier) firstByPack.set(quest.packId, quest);
		}

		return new Set([...firstByPack.values()].map((quest) => quest.id));
	}

	/** Resolves the PACK_GATES rule (by pack and world order) into boss quest ids per gated pack id. */
	private findPackGates(): Map<string, string[]>
	{
		const gates = new Map<string, string[]>();

		for (const gate of PACK_GATES)
		{
			const gatedPackIds = new Set(this.quests.filter((quest) => quest.packOrder === gate.packOrder).map((quest) => quest.packId));
			const bossIds = gate.requiresBossOf.flatMap((world) =>
				this.quests
					.filter((quest) => quest.kind === "boss" && quest.packOrder === world.packOrder && quest.worldOrder === world.worldOrder)
					.map((quest) => quest.id),
			);

			for (const packId of gatedPackIds) gates.set(packId, bossIds);
		}

		return gates;
	}

	/** Quest titles joined as "A", "A and B", or "A, B, and C". */
	private joinTitles(questIds: string[]): string
	{
		return this.joinList(questIds.map((questId) => this.questsById.get(questId)?.title ?? questId));
	}

	/** Words joined as "A", "A and B", or "A, B, and C". */
	private joinList(words: string[]): string
	{
		if (words.length <= 2) return words.join(" and ");

		return `${words.slice(0, -1).join(", ")}, and ${words[words.length - 1]}`;
	}
}
