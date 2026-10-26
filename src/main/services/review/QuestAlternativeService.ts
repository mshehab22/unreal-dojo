// "An alternative" after a pass: the quest's authored idiomatic version with its tradeoff note, answered from main only once the quest is passed (A850).
import type { AuthoredQuest } from "@shared/types/content";
import type { PlayerProgress } from "@shared/types/progress";
import type { QuestAlternative } from "@shared/types/review";

import { AppErrorException } from "../../errors/AppErrorException";

/** What the alternative needs, as functions so tests pass plain data. */
export interface QuestAlternativeSources
{
	/** One quest with everything, or undefined for an unknown id. */
	getAuthoredQuest: (questId: string) => Promise<AuthoredQuest | undefined>;

	/** The learner's save, for the quest's status and its attempts. */
	getProgress: () => PlayerProgress;
}

/** The authored alternative of a quest kind that has one: `alternative` on build and refactor, `alternativeNote` on breakdown. */
function authoredAlternative(quest: AuthoredQuest): string | null
{
	if (quest.kind === "build" || quest.kind === "refactor") return quest.alternative;
	if (quest.kind === "breakdown") return quest.alternativeNote;

	return null;
}

/** Answers a passed quest's alternative. No AI is asked, so it costs nothing and needs no provider (A850). */
export class QuestAlternativeService
{
	/** Keeps the sources. */
	constructor(private readonly sources: QuestAlternativeSources)
	{
	}

	/** The alternative of a passed quest, or null when the quest kind has none (concept, boss). Throws alternative-locked before a pass. */
	async getAlternative(questId: string): Promise<QuestAlternative | null>
	{
		const quest = await this.sources.getAuthoredQuest(questId);
		if (!quest) throw new AppErrorException("quest-not-found", "That quest is not in the content.", "Go back to the World Map and open it again.", questId);

		const markdown = authoredAlternative(quest);
		if (markdown === null || markdown.trim().length === 0) return null;

		const progress = this.sources.getProgress();
		if (progress.quests[questId]?.status !== "passed") throw new AppErrorException("alternative-locked", "The alternative opens after you pass this quest.", "Pass the quest, then look again: it shows an idiomatic version with its tradeoff.", questId);

		// The reviewer's own pointer, from the latest passed attempt an AI reviewed; a tests-only hint is generic, so it is left out.
		const reviewHint = [...progress.attempts].reverse().find((attempt) => attempt.questId === questId && attempt.passed && attempt.review && attempt.review.provider !== "tests-only" && attempt.review.alternativeHint.trim().length > 0)?.review?.alternativeHint.trim();

		return reviewHint ? { questId, markdown, reviewHint } : { questId, markdown };
	}
}
