// Records a graded attempt in the fake's save and itemizes what it earned, following the progress-and-rules tables closely enough for the loot screen.
import type { LearnerQuest } from "@shared/types/catalog";
import type { AttemptOutcome, ChestReward, MasteryLevel, PatternCardTier, PlayerProgress, QuestProgress, RulesSnapshot, XpBreakdown } from "@shared/types/progress";
import type { CodeReview } from "@shared/types/review";
import type { RunResult } from "@shared/types/run";

import { levelStanding } from "../../lib/levels";

import { todayLocal } from "./fixtures/fakeClock";

/** What one attempt was, as the ledger needs it. */
export interface LedgerAttempt
{
	quest: LearnerQuest;
	score: number;
	passed: boolean;

	/** True for a build or refactor attempt that compiled (effort XP). */
	compiled: boolean;

	/** True for a build or refactor Submit, which moves the spree. */
	movesSpree: boolean;
	review?: CodeReview;

	/** The submitted files and the engine's verdict, kept on build Submits as the progress service keeps them (A740). */
	files?: Record<string, string>;
	run?: RunResult;
}

/** An empty quest save entry. */
export function emptyQuestProgress(): QuestProgress
{
	return { status: "in_progress", bestScore: null, attempts: 0, hintsRevealed: 0, revealedHints: [], solutionViewed: false, seerStoneSpent: false, effortXpGranted: false, savedFiles: {}, lastAttemptAt: null };
}

/** The rules band multiplier for a quest's difficulty against the learner's level. */
function bandMultiplier(difficulty: number, level: number, rules: RulesSnapshot): number
{
	const learnerBand = Math.min(5, Math.max(1, Math.floor(level / 4) + 1));
	const gap = difficulty - learnerBand;
	const band = gap >= 2 ? "far-above" : gap === 1 ? "above" : gap === 0 ? "at-level" : gap === -1 ? "below" : "far-below";

	return rules.xpBands.find((rule) => rule.band === band)?.multiplier ?? 1;
}

/** The tier a number of use cases earns. */
function tierFor(useCases: number, rules: RulesSnapshot): PatternCardTier
{
	if (useCases >= rules.cardTierThresholds.gold) return "gold";
	if (useCases >= rules.cardTierThresholds.silver) return "silver";

	return "bronze";
}

/** Prices the attempt, writes it into the save, and returns the loot. `chest` is what a finished daily offer pays, if any. */
export function recordAttempt(progress: PlayerProgress, rules: RulesSnapshot, attempt: LedgerAttempt, chest: ChestReward | undefined): AttemptOutcome
{
	const { quest } = attempt;
	const questProgress = { ...(progress.quests[quest.id] ?? emptyQuestProgress()) };
	const wasPassed = questProgress.status === "passed";
	const before = levelStanding(progress.xp, rules);
	const multiplier = bandMultiplier(quest.difficulty, before.level, rules);
	const firstPass = attempt.passed && !wasPassed ? Math.round(quest.xp * multiplier) : 0;
	const hintCost = attempt.passed && !wasPassed ? -Math.round(quest.xp * rules.hintCostShare) * questProgress.hintsRevealed : 0;
	const effort = !attempt.passed && attempt.compiled && attempt.movesSpree && !questProgress.effortXpGranted ? Math.round(quest.xp * rules.effortShare) : 0;

	const spree = { ...progress.spree };
	const isFirstSubmit = attempt.movesSpree && !wasPassed && questProgress.attempts === 0;
	if (isFirstSubmit) spree.current = attempt.passed ? spree.current + 1 : 0;
	spree.best = Math.max(spree.best, spree.current);

	const spreeBonus = attempt.passed && spree.current >= rules.spreeBonusThreshold ? Math.round(firstPass * rules.spreeBonusShare) : 0;
	const xp: XpBreakdown = { base: quest.xp, difficultyMultiplier: multiplier, firstPass, spreeBonus, hintCost, effort, potionBonus: 0, total: Math.max(0, firstPass + spreeBonus + hintCost + effort) };

	const streak = { ...progress.streak };
	const today = todayLocal();
	let milestoneReached: number | undefined;
	if (attempt.passed && streak.lastActivityAt?.slice(0, 10) !== today)
	{
		streak.count += 1;
		streak.lastActivityAt = new Date().toISOString();
		if (rules.streakMilestones.includes(streak.count) && !streak.milestones.includes(streak.count))
		{
			milestoneReached = streak.count;
			streak.milestones = [...streak.milestones, streak.count];
		}
	}

	const cardChanges: AttemptOutcome["cardChanges"] = [];
	const patternCards = { ...progress.patternCards };
	if (attempt.passed)
	{
		for (const patternId of quest.patterns)
		{
			const card = patternCards[patternId];
			const useCases = [...new Set([...(card?.useCasesPassed ?? []), quest.id])];
			const tierAfter = tierFor(useCases.length, rules);
			if (!card || card.tier !== tierAfter) cardChanges.push({ patternId, tierBefore: card?.tier ?? null, tierAfter });
			patternCards[patternId] = { tier: tierAfter, useCasesPassed: useCases };
		}
	}

	const skillChanges: AttemptOutcome["skillChanges"] = [];
	const skills = { ...progress.skills };
	if (attempt.passed && !wasPassed)
	{
		for (const skillId of quest.skills)
		{
			const skill = skills[skillId];
			const masteryBefore: MasteryLevel | null = skill?.mastery ?? null;
			const masteryAfter: MasteryLevel = masteryBefore === null || masteryBefore === "attempted" ? "familiar" : masteryBefore;
			const pointsGained = quest.difficulty * (quest.kind === "boss" ? 2 : 1);
			skills[skillId] = { points: (skill?.points ?? 0) + pointsGained, mastery: masteryAfter };
			skillChanges.push({ skillId, pointsGained, masteryBefore, masteryAfter });
		}
	}

	const attemptId = `fake-attempt-${progress.attempts.length + 1}`;
	const record = { attemptId, questId: quest.id, at: new Date().toISOString(), score: attempt.score, passed: attempt.passed, xpGained: xp.total, ...(attempt.review ? { review: attempt.review } : {}), ...(attempt.files ? { files: attempt.files } : {}), ...(attempt.run ? { run: attempt.run } : {}) };

	questProgress.status = attempt.passed || wasPassed ? "passed" : "in_progress";
	questProgress.bestScore = Math.max(questProgress.bestScore ?? 0, attempt.score);
	questProgress.attempts += 1;
	questProgress.lastAttemptAt = record.at;
	if (effort > 0) questProgress.effortXpGranted = true;

	const totalXp = progress.xp + xp.total;
	const after = levelStanding(totalXp, rules);

	Object.assign(progress, {
		xp: totalXp,
		role: after.role,
		spree,
		streak,
		patternCards,
		skills,
		quests: { ...progress.quests, [quest.id]: questProgress },
		attempts: [...progress.attempts, record],
		updatedAt: record.at,
	});

	// The three soonest due times, past ones included, as the progress service answers them.
	const nextDueDates = Object.values(progress.schedule).sort().slice(0, 3);

	return {
		attempt: record,
		xp,
		level: { before: before.level, after: after.level },
		role: { before: before.role, after: after.role },
		cardChanges,
		skillChanges,
		spree: { current: spree.current, best: spree.best, armorUsed: false },
		streak: { count: streak.count, ...(milestoneReached ? { milestoneReached } : {}) },
		...(chest ? { chest } : {}),
		unlockedQuestIds: [],
		nextDueDates,
	};
}
