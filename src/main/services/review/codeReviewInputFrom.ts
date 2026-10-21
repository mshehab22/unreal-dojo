// Turns an authored build or refactor quest, the learner's files, and the engine's verdict into what the code reviewer reads.
import type { AuthoredQuest, BuildQuest, PatternCard, RefactorQuest } from "@shared/types/content";
import type { RunResult } from "@shared/types/run";

import type { CodeReviewInput } from "./ReviewInputs";

/** The quests whose Submit gets a code review. */
export type ReviewedCodeQuest = BuildQuest | RefactorQuest;

/** True for a build or refactor quest, the kinds `submitQuest` reviews (A461). */
export function isReviewedCodeQuest(quest: AuthoredQuest): quest is ReviewedCodeQuest
{
	return quest.kind === "build" || quest.kind === "refactor";
}

/** Builds the code reviewer's input. Pattern ids become their card titles ("Observer"); an id with no card is kept as written. */
export function codeReviewInputFrom(quest: ReviewedCodeQuest, patternCards: readonly PatternCard[], files: Record<string, string>, run: RunResult): CodeReviewInput
{
	const titlesById = new Map(patternCards.map((card) => [card.id, card.title]));

	return {
		questId: quest.id,
		questTitle: quest.title,
		brief: quest.brief,
		rubric: [...quest.rubric],
		patternNames: quest.patterns.map((patternId) => titlesById.get(patternId) ?? patternId),
		files: { ...files },
		run,
	};
}
