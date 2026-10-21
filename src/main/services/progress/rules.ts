// Every rule constant of progress-and-rules in one place. The UI reads them through `getRules`, never duplicates them. See docs/systems/progress-and-rules.md.
import type { MasteryLevel, PatternCardTier, RulesSnapshot, XpBandRule } from "@shared/types/progress";

import type { QuestKind } from "./contentFacts";

/** Save file schema version. Raise it with a migration in ProgressStore when the save shape changes. */
export const SAVE_VERSION = 2;

/** Minimum score (0 to 100) to pass a build, refactor, breakdown, or boss integration. */
export const PASS_SCORE = 70;

/** Weight of the test score in a build or refactor score; the review gets the rest. */
export const TEST_SCORE_WEIGHT = 0.6;

/** Share of concept questions that must be right to pass. */
export const CONCEPT_PASS_SHARE = 0.8;

/** First-pass XP multiplier by how far the quest's difficulty sits from the learner's level band. */
export const XP_BANDS: XpBandRule[] = [
	{ band: "far-above", multiplier: 1.3 },
	{ band: "above", multiplier: 1.12 },
	{ band: "at-level", multiplier: 1.0 },
	{ band: "below", multiplier: 0.6 },
	{ band: "far-below", multiplier: 0.25 },
];

/** Levels per learner band step: band = floor(level / 4) + 1. */
export const LEVELS_PER_BAND = 4;

/** Lowest and highest band and quest difficulty. */
export const DIFFICULTY_RANGE = { min: 1, max: 5 } as const;

/** Share of base XP each revealed hint spell costs on a pass. */
export const HINT_COST_SHARE = 0.15;

/** Hint spells per quest, revealed in order. */
export const HINTS_PER_QUEST = 3;

/** Share of first-pass XP a rematch pass pays. */
export const REMATCH_SHARE = 0.5;

/** Share of base XP a failed but compiled attempt pays, once per quest. Build, refactor, and boss only (A139). */
export const EFFORT_SHARE = 0.05;

/** Quest kinds whose failed but compiled attempts pay effort XP (A139). */
export const EFFORT_QUEST_KINDS: QuestKind[] = ["build", "refactor", "boss"];

/** Flat XP per completed drill. */
export const DRILL_XP = 10;

/** Level curve: XP to the next level = round(base * growth ^ (level - 1)). */
export const LEVEL_CURVE = { base: 200, growth: 1.35 } as const;

/** Roles and the level each starts at, lowest first. */
export const ROLES: { level: number; name: string }[] = [
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
];

/** Distinct use-case quests passed for each pattern card tier. */
export const CARD_TIER_THRESHOLDS: Record<PatternCardTier, number> = { bronze: 1, silver: 3, gold: 5 };

/** Skill points multiplier for a boss pass (other quests give their difficulty). */
export const BOSS_SKILL_MULTIPLIER = 2;

/** Mastery levels from lowest to highest. */
export const MASTERY_ORDER: MasteryLevel[] = ["attempted", "familiar", "proficient", "mastered"];

/** Successful recalls in a row for familiar and proficient, and the interval in days for mastered. */
export const MASTERY_THRESHOLDS = { familiarRecalls: 1, proficientRecalls: 3, masteredIntervalDays: 30 } as const;

/** Spree length where the spree bonus starts, and its share of the pass's XP. */
export const SPREE_BONUS = { threshold: 5, share: 0.05 } as const;

/** Most spree armor held at once (A124). */
export const MAX_ARMOR = 2;

/** Days the streak survives without activity; one freeze covers one more window of this many days. */
export const STREAK_WINDOW_DAYS = 3;

/** Streak counts that are celebrated. */
export const STREAK_MILESTONES = [7, 30, 100];

/** Most streak freezes held at once. */
export const MAX_FREEZES = 2;

/** Most Seer Stones held at once. */
export const MAX_SEER_STONES = 2;

/** Failed submits before the Seer Stone and Parsons fallback offers appear. */
export const FAILED_SUBMITS_BEFORE_OFFERS = 2;

/** Days from viewing a solution to its rematch. */
export const REMATCH_AFTER_DAYS = 3;

/** SM-2 settings: starting and lowest ease, the first two intervals. */
export const SM2 = { startEase: 2.5, minimumEase: 1.3, firstIntervalDays: 1, secondIntervalDays: 3 } as const;

/** Score floors for SM-2 quality 5 and 4; a pass below them is 3, a miss at or above `missHighScore` is 2, lower is 1. */
export const QUALITY_FROM_SCORE = { perfect: 95, good: 85, missHighScore: 50 } as const;

/** Lowest quality that counts as a successful recall. */
export const SUCCESSFUL_QUALITY = 3;

/** SM-2 quality of a plain right and a plain wrong drill answer (A122). */
export const ANSWER_QUALITY = { correct: 4, wrong: 1 } as const;

/** Most items due per day; the rest slides to the next day. */
export const DAILY_DUE_CAP = 20;

/** Hovers on an unpassed term that push it into the next drill. */
export const HOVER_INJECTION_THRESHOLD = 3;

/** Fewest and most items in one drill. */
export const DRILL_SIZE = { min: 6, max: 10 } as const;

/** XP potion: bonus share of XP and how long it lasts. */
export const XP_POTION = { share: 0.5, minutes: 30 } as const;

/** Studio cosmetics a chest can hold, in the order they are given out. */
export const STUDIO_COSMETICS = ["neon-sign", "arcade-cabinet", "whiteboard-wall", "plant-corner", "trophy-shelf", "server-rack-lights", "coffee-bar", "poster-wall"];

/** One world whose boss a pack gate waits for, named by pack id and world id (A68, A510). */
export interface PackGateWorld
{
	/** The pack holding the world. */
	packId: string;

	/** The world id (its `world.json` id), which stays put when worlds are added before it. */
	worldId: string;
}

/** A gate: the pack in position `packOrder` opens only once the boss of every listed world is passed. A listed world that does not exist yet keeps the pack closed. */
export interface PackGate
{
	/** The gated pack's position (1 to 4; Pack 4, Systems Lab, has no folder or id yet). */
	packOrder: number;

	/** The worlds whose bosses must be passed. */
	requiresBossOf: PackGateWorld[];
}

/** Pack 4 opens after the Pack 1 Communication world's boss (world 5) and the Pack 2 Component world's boss (A68, A510). */
export const PACK_GATES: PackGate[] = [
	{ packOrder: 4, requiresBossOf: [{ packId: "foundations", worldId: "communication" }, { packId: "patterns", worldId: "component" }] },
];

/** Builds the snapshot the renderer reads through `getRules`. */
export function createRulesSnapshot(): RulesSnapshot
{
	return {
		passScore: PASS_SCORE,
		conceptPassShare: CONCEPT_PASS_SHARE,
		xpBands: XP_BANDS.map((band) => ({ ...band })),
		hintCostShare: HINT_COST_SHARE,
		rematchShare: REMATCH_SHARE,
		drillXp: DRILL_XP,
		levelCurveBase: LEVEL_CURVE.base,
		levelCurveGrowth: LEVEL_CURVE.growth,
		roles: ROLES.map((role) => ({ ...role })),
		cardTierThresholds: { ...CARD_TIER_THRESHOLDS },
		streakWindowDays: STREAK_WINDOW_DAYS,
		streakMilestones: [...STREAK_MILESTONES],
		maxFreezes: MAX_FREEZES,
		maxSeerStones: MAX_SEER_STONES,
		spreeBonusThreshold: SPREE_BONUS.threshold,
		spreeBonusShare: SPREE_BONUS.share,
		drillSize: { ...DRILL_SIZE },
		dailyDueCap: DAILY_DUE_CAP,
		failedSubmitsBeforeOffers: FAILED_SUBMITS_BEFORE_OFFERS,
		maxArmor: MAX_ARMOR,
		hintsPerQuest: HINTS_PER_QUEST,
		rematchAfterDays: REMATCH_AFTER_DAYS,
		xpPotion: { ...XP_POTION },
		masteryThresholds: { ...MASTERY_THRESHOLDS },
		hoverInjectionThreshold: HOVER_INJECTION_THRESHOLD,
		effortShare: EFFORT_SHARE,
		studioCosmetics: [...STUDIO_COSMETICS],
	};
}
