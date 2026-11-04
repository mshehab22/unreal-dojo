// Records a graded attempt in the fake's save and itemizes what it earned, following the progress-and-rules tables closely enough for the loot screen.
import type { LearnerQuest } from "@shared/types/catalog";
import type { AttemptOutcome, ChestReward, MasteryLevel, PatternCardTier, PlayerProgress, QuestProgress, RulesSnapshot, XpBreakdown } from "@shared/types/progress";
import type { CodeReview } from "@shared/types/review";
import type { RunResult } from "@shared/types/run";

import { levelStanding } from "../../lib/levels";

import { localDayOf, todayLocal } from "./fixtures/fakeClock";

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

/** Counts today as an active day: the streak grows once per calendar day and reports a milestone (7, 30, 100) the first time it is reached. */
export function recordStreakDay(current: PlayerProgress["streak"], rules: RulesSnapshot): { streak: PlayerProgress["streak"]; milestoneReached: number | undefined }
{
	const streak = { ...current, milestones: [...current.milestones] };

	if (streak.lastActivityAt && localDayOf(streak.lastActivityAt) === todayLocal()) return { streak, milestoneReached: undefined };

	streak.count += 1;
	streak.lastActivityAt = new Date().toISOString();

	if (!rules.streakMilestones.includes(streak.count) || streak.milestones.includes(streak.count)) return { streak, milestoneReached: undefined };

	streak.milestones.push(streak.count);

	return { streak, milestoneReached: streak.count };
}

/** Prices the attempt, writes it into the save, and returns the loot. `chest` is what a finished daily offer pays, if any. */
export function recordAttempt(progress: PlayerProgress, rules: RulesSnapshot, attempt: LedgerAttempt, chest: ChestReward | undefined): AttemptOutcome
{
	const { quest } = attempt;
	const questProgress = { ...(progress.quests[quest.id] ?? emptyQuestProgress()) };
	const wasPassed = questProgress.status === "passed";
	const before = levelStanding(progress.xp, rules);
	const multiplier = bandMultiplier(quest.difficulty, before.level, rules);
	// A solution viewed without a Seer Stone takes the quest's first-pass XP (A1391).
	const forfeited = questProgress.solutionViewed && !questProgress.seerStoneSpent;
	const firstPass = attempt.passed && !wasPassed && !forfeited ? Math.round(quest.xp * multiplier) : 0;
	const hintCost = attempt.passed && !wasPassed ? -Math.round(quest.xp * rules.hintCostShare) * questProgress.hintsRevealed : 0;
	const effort = !attempt.passed && attempt.compiled && attempt.movesSpree && !questProgress.effortXpGranted ? Math.round(quest.xp * rules.effortShare) : 0;

	// Armor absorbs one missed first try, as the spree rules do.
	const spree = { ...progress.spree };
	const isFirstSubmit = attempt.movesSpree && !wasPassed && questProgress.attempts === 0;
	const armorUsed = isFirstSubmit && !attempt.passed && spree.current > 0 && spree.armor > 0;
	if (armorUsed) spree.armor -= 1;
	else if (isFirstSubmit) spree.current = attempt.passed ? spree.current + 1 : 0;
	spree.best = Math.max(spree.best, spree.current);

	const spreeBonus = attempt.passed && spree.current >= rules.spreeBonusThreshold ? Math.round(firstPass * rules.spreeBonusShare) : 0;
	const xp: XpBreakdown = { base: quest.xp, difficultyMultiplier: multiplier, firstPass, spreeBonus, hintCost, effort, potionBonus: 0, total: Math.max(0, firstPass + spreeBonus + hintCost + effort) };

	const { streak, milestoneReached } = attempt.passed ? recordStreakDay(progress.streak, rules) : { streak: { ...progress.streak }, milestoneReached: undefined };

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
		spree: { current: spree.current, best: spree.best, armorUsed },
		streak: { count: streak.count, ...(milestoneReached ? { milestoneReached } : {}) },
		...(chest ? { chest } : {}),
		unlockedQuestIds: [],
		nextDueDates,
	};
}
