// The "economy" fake scenario (M3.3, A1399): the quest-flow learner one active day short of the 7 day milestone, with a spree of 4, one armor, one Seer Stone,
// today's three daily offers not chosen yet, and World 1 ready to test out, so every economy flow can be played from its start.
import type { PlayerProgress } from "@shared/types/progress";

import { daysFromNow, localDayOf, todayLocal } from "./fakeClock";
import { questFlowProgressFixture } from "./questFlowFixture";

/** The quest-flow save with the economy's starting points. */
export function economyProgressFixture(): PlayerProgress
{
	const progress = questFlowProgressFixture();

	return {
		...progress,
		streak: { count: 6, lastActivityAt: daysFromNow(-1), freezes: 1, milestones: [] },
		spree: { current: 4, best: 4, armor: 1 },
		seerStones: 1,
		xpPotionUntil: null,
		daily: {
			date: todayLocal(),
			offered: [{ kind: "drill" }, { kind: "concept", questId: "f1-uobject-and-actor" }, { kind: "build", questId: "f1-training-dummy" }],
			done: false,
			monthBadges: [],
			completedDates: [localDayOf(daysFromNow(-1))],
		},
	};
}
