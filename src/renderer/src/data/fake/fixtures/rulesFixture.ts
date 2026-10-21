// The rule constants the fake answers `getRules` with, matching the values in progress-and-rules (M1.6).
import type { RulesSnapshot } from "@shared/types/progress";

/** A realistic RulesSnapshot. Screens read these only through the DojoClient, never from here. */
export function rulesFixture(): RulesSnapshot
{
	return {
		passScore: 70,
		conceptPassShare: 0.8,
		xpBands: [
			{ band: "far-above", multiplier: 1.3 },
			{ band: "above", multiplier: 1.12 },
			{ band: "at-level", multiplier: 1 },
			{ band: "below", multiplier: 0.6 },
			{ band: "far-below", multiplier: 0.25 },
		],
		hintCostShare: 0.15,
		rematchShare: 0.5,
		drillXp: 10,
		levelCurveBase: 200,
		levelCurveGrowth: 1.35,
		roles: [
			{ level: 1, name: "Apprentice" },
			{ level: 4, name: "Scripter" },
			{ level: 8, name: "Builder" },
			{ level: 12, name: "Systems Smith" },
			{ level: 16, name: "Pattern Seeker" },
			{ level: 20, name: "Architect" },
			{ level: 25, name: "Engine Whisperer" },
			{ level: 30, name: "Lead" },
			{ level: 40, name: "Principal" },
			{ level: 50, name: "Legend" },
		],
		cardTierThresholds: { bronze: 1, silver: 3, gold: 5 },
		streakWindowDays: 3,
		streakMilestones: [7, 30, 100],
		maxFreezes: 2,
		maxSeerStones: 2,
		spreeBonusThreshold: 5,
		spreeBonusShare: 0.05,
		drillSize: { min: 6, max: 10 },
		dailyDueCap: 20,
		failedSubmitsBeforeOffers: 2,
		maxArmor: 2,
		hintsPerQuest: 3,
		rematchAfterDays: 3,
		xpPotion: { share: 0.5, minutes: 30 },
		masteryThresholds: { familiarRecalls: 1, proficientRecalls: 3, masteredIntervalDays: 30 },
		hoverInjectionThreshold: 3,
		effortShare: 0.05,
		studioCosmetics: ["neon-sign", "arcade-cabinet", "whiteboard-wall", "plant-corner", "trophy-shelf", "server-rack-lights", "coffee-bar", "poster-wall"],
	};
}
