// The save a brand-new learner starts with.
import type { PlayerProgress, QuestProgress } from "@shared/types/progress";

import { ROLES, SAVE_VERSION } from "./rules";

/** Returns a fresh save created at `now`. */
export function createNewProgress(now: Date): PlayerProgress
{
	const moment = now.toISOString();

	return {
		version: SAVE_VERSION,
		playerName: "",
		studio: { name: "", modules: [], cosmetics: [] },
		xp: 0,
		role: ROLES[0]?.name ?? "",
		streak: { count: 0, lastActivityAt: null, freezes: 0, milestones: [] },
		spree: { current: 0, best: 0, armor: 0 },
		seerStones: 0,
		patternCards: {},
		skills: {},
		quests: {},
		attempts: [],
		reviewLog: [],
		schedule: {},
		memory: {},
		drillQueue: [],
		rematches: {},
		testedOutWorldIds: [],
		xpPotionUntil: null,
		hoverCounts: {},
		// An empty date means "never offered", so the first getDailyQuest makes today's offers.
		daily: { date: "", offered: [], done: false, monthBadges: [], completedDates: [] },
		createdAt: moment,
		updatedAt: moment,
	};
}

/** Returns the progress of a quest nobody has touched. */
export function createNewQuestProgress(): QuestProgress
{
	return {
		status: "available",
		bestScore: null,
		attempts: 0,
		hintsRevealed: 0,
		solutionViewed: false,
		seerStoneSpent: false,
		effortXpGranted: false,
		savedFiles: {},
		lastAttemptAt: null,
	};
}
