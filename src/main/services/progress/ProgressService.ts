// The progress service: holds the learner's save in the main process, applies every rule to attempts and reviews, and saves atomically.
import type { AppError } from "@shared/types/errors";
import type {
	AttemptOutcome,
	BreakdownPlan,
	ChestReward,
	DailyQuestState,
	DrillItemResult,
	DrillOutcome,
	DrillSummary,
	HintReveal,
	MasteryLevel,
	PlayerProgress,
	QuestAvailability,
	QuestDraft,
	QuestProgress,
	RulesSnapshot,
} from "@shared/types/progress";

import { AppErrorException } from "../../errors/AppErrorException";
import { addMinutes } from "./calendarDays";
import { ChestRules } from "./ChestRules";
import type { Clock } from "./Clock";
import { createNewProgress, createNewQuestProgress } from "./createNewProgress";
import { type DailyCandidates, DailyQuestService } from "./DailyQuestService";
import { DrillScheduler } from "./DrillScheduler";
import { HintSpellRules } from "./HintSpellRules";
import { LevelRules } from "./LevelRules";
import { PatternCardRules } from "./PatternCardRules";
import type { ProgressStore } from "./ProgressStore";
import type { RandomSource } from "./RandomSource";
import { RematchSelector } from "./RematchSelector";
import type { ReviewScheduler } from "./ReviewScheduler";
import type { RuleQuest } from "./RuleQuest";
import { createRulesSnapshot, XP_POTION } from "./rules";
import { SeerStoneRules, type SolutionView } from "./SeerStoneRules";
import { SkillRules } from "./SkillRules";
import { Sm2Scheduler } from "./Sm2Scheduler";
import { SpreeRules } from "./SpreeRules";
import { StreakRules } from "./StreakRules";
import { TestOutRules } from "./TestOutRules";
import { type UnlockState, UnlockGraph } from "./UnlockGraph";
import { type AttemptResultKind, XpRules } from "./XpRules";

/** One graded attempt to record. The caller (the submit flow, the concept and breakdown handlers) has already graded it with PassRules. */
export interface AttemptInput
{
	/** The quest attempted. */
	quest: RuleQuest;

	/** Score from 0 to 100. */
	score: number;

	/** True when the attempt passed. */
	passed: boolean;

	/** True when the code compiled (always true for kinds without code). */
	compiled: boolean;

	/** True for a Submit of a build, refactor, or boss integration (the only attempts that can move the spree). */
	isSubmit: boolean;

	/** Items to review in the same step before the attempt is priced, for example a concept quest's terms, so unlocks they cause appear in the outcome. */
	itemReviews?: { itemId: string; quality: number; context?: ReviewContext }[];
}

/** Where a review item came from, so skill mastery and rematches can follow it. */
export interface ReviewContext
{
	/** The skill the item trains. */
	skillId?: string;

	/** The world the item was earned in. */
	earnedInWorldId?: string;
}

/** Drill totals the drill session hands over when it finishes. */
export interface DrillTotals
{
	/** Items answered right. */
	correctCount: number;

	/** Items in the drill. */
	totalCount: number;
}

/** Owns the save and the rules. Every change is saved before the method resolves. */
export class ProgressService
{
	/** XP pricing. */
	private readonly xpRules = new XpRules();

	/** Levels and roles. */
	private readonly levelRules = new LevelRules();

	/** Pattern cards. */
	private readonly cardRules = new PatternCardRules();

	/** Skill points and skill mastery. */
	private readonly skillRules = new SkillRules();

	/** Spree and armor. */
	private readonly spreeRules = new SpreeRules();

	/** Streak and freezes. */
	private readonly streakRules = new StreakRules();

	/** Hint spells. */
	private readonly hintRules = new HintSpellRules();

	/** Seer Stones. */
	private readonly seerStoneRules = new SeerStoneRules();

	/** Daily due cap and drill composition. */
	private readonly drillScheduler = new DrillScheduler();

	/** Daily quest. */
	private readonly dailyQuest = new DailyQuestService();

	/** Chest rolls. */
	private readonly chestRules = new ChestRules();

	/** Test-out. */
	private readonly testOutRules = new TestOutRules();

	/** Rematch world selection. */
	private readonly rematchSelector = new RematchSelector();

	/** Turns a rematch score into SM-2 quality for the items it exercised. */
	private readonly sm2Quality = new Sm2Scheduler();

	/** The last queued mutation, so each one reads the state the previous one committed. */
	private pendingMutation: Promise<unknown> = Promise.resolve();

	/** Why the save could not be opened, or null when it is open. A refused service answers every save call with this error. */
	private refusal: AppError | null = null;

	/** Builds the service around a loaded save. Use `ProgressService.openOrRefuse` in the app. */
	constructor(
		private progress: PlayerProgress,
		private readonly store: ProgressStore,
		private readonly clock: Clock,
		private readonly random: RandomSource,
		private readonly scheduler: ReviewScheduler = new Sm2Scheduler(),
	)
	{}

	/** Loads the save from the store (recovering from a corrupt file) and builds the service. Throws when the save cannot be opened. */
	static async open(store: ProgressStore, clock: Clock, random: RandomSource, scheduler?: ReviewScheduler): Promise<ProgressService>
	{
		const loaded = await store.load(clock.now());

		return new ProgressService(loaded.progress, store, clock, random, scheduler);
	}

	/** Like `open`, but never throws: a save that cannot be opened (newer version, locked, unreadable) gives a refused service so the app still starts. */
	static async openOrRefuse(store: ProgressStore, clock: Clock, random: RandomSource, scheduler?: ReviewScheduler): Promise<ProgressService>
	{
		try
		{
			return await ProgressService.open(store, clock, random, scheduler);
		}
		catch (error)
		{
			const service = new ProgressService(createNewProgress(clock.now()), store, clock, random, scheduler);
			service.refusal = error instanceof AppErrorException
				? error.appError
				: { code: "save-failed", message: "Your progress file could not be opened.", suggestedAction: "Close other programs using it, then restart Unreal Dojo.", detail: error instanceof Error ? error.message : String(error) };

			return service;
		}
	}

	/** Why the save could not be opened, or null when it is open. */
	getRefusal(): AppError | null
	{
		return this.refusal;
	}

	/** A copy of the whole save. */
	getProgress(): PlayerProgress
	{
		this.ensureAvailable();

		return structuredClone(this.progress);
	}

	/** The rule constants for the UI. */
	getRules(): RulesSnapshot
	{
		return createRulesSnapshot();
	}

	/** Sets the learner's display name. */
	setPlayerName(name: string): Promise<PlayerProgress>
	{
		return this.enqueue(async () =>
		{
			await this.commit((progress) => ({ ...progress, playerName: name }));

			return this.getProgress();
		});
	}

	/** Deletes all progress and starts over. */
	resetProgress(): Promise<PlayerProgress>
	{
		return this.enqueue(async () =>
		{
			await this.commit(() => createNewProgress(this.clock.now()));

			return this.getProgress();
		});
	}

	/** Autosaves a quest in progress. Marks an untouched quest in progress. */
	saveQuestDraft(draft: QuestDraft): Promise<void>
	{
		return this.enqueue(async () =>
		{
			await this.commit((progress) =>
			{
				const quest = this.questProgressOf(progress, draft.questId);
				const next: QuestProgress = { ...quest, status: quest.status === "passed" ? "passed" : "in_progress" };

				if (draft.files) next.savedFiles = { ...draft.files };
				if (draft.breakdownPlan) next.breakdownPlan = structuredClone(draft.breakdownPlan);

				return { ...progress, quests: { ...progress.quests, [draft.questId]: next } };
			});
		});
	}

	/** Throws away a quest's draft (files, board, note). Score, attempts, hints, and status stay. */
	resetQuest(questId: string): Promise<QuestProgress>
	{
		return this.enqueue(async () =>
		{
			await this.commit((progress) =>
			{
				const { breakdownPlan: _plan, revisionNote: _note, ...rest } = this.questProgressOf(progress, questId);

				return { ...progress, quests: { ...progress.quests, [questId]: { ...rest, savedFiles: {} } } };
			});

			return structuredClone(this.questProgressOf(this.progress, questId));
		});
	}

	/** Counts one hover on a glossary term. */
	recordTermHover(termId: string): Promise<void>
	{
		return this.enqueue(async () =>
		{
			await this.commit((progress) => ({ ...progress, hoverCounts: { ...progress.hoverCounts, [termId]: (progress.hoverCounts[termId] ?? 0) + 1 } }));
		});
	}

	/** Adds an item to the next drill ("Drill me"). Asking twice keeps one entry. */
	queueDrillItem(itemId: string): Promise<void>
	{
		return this.enqueue(async () =>
		{
			if (this.progress.drillQueue.includes(itemId)) return;

			await this.commit((progress) => ({ ...progress, drillQueue: [...progress.drillQueue, itemId] }));
		});
	}

	/** Due counts for the Studio home. */
	getDrillSummary(): DrillSummary
	{
		this.ensureAvailable();

		return this.drillScheduler.summary(this.progress, this.clock.now());
	}

	/** Today's due items in priority order, capped at the daily cap. The drill session composes from these. */
	getDueItemIds(): string[]
	{
		this.ensureAvailable();

		return this.drillScheduler.dueToday(this.progress, this.clock.now());
	}

	/** Reveals the next hint spell of a quest and returns its cost. */
	revealHint(quest: RuleQuest, hints: string[]): Promise<HintReveal>
	{
		return this.enqueue(async () =>
		{
			const current = this.questProgressOf(this.progress, quest.id);
			const hintIndex = this.hintRules.nextHintIndex(current.hintsRevealed, hints.length);

			if (hintIndex === null) throw new AppErrorException("invalid-payload", "Every hint for this quest is already revealed.", "Use the hints above, or view the solution after two failed submits.");

			await this.commit((progress) => this.withQuest(progress, quest.id, { hintsRevealed: hintIndex + 1 }));

			return { hintIndex, text: hints[hintIndex] ?? "", xpCost: this.hintRules.costPerHint(quest.xp), hintsRevealed: hintIndex + 1 };
		});
	}

	/** Views a quest's reference solution after two failed submits, spending a Seer Stone when asked, and schedules the rematch. */
	viewSolution(questId: string, spendStone: boolean): Promise<SolutionView>
	{
		return this.enqueue(async () =>
		{
			const current = this.questProgressOf(this.progress, questId);

			if (current.status !== "passed" && !this.seerStoneRules.canOfferSolution(current.attempts))
			{
				throw new AppErrorException("quest-locked", "The solution opens after two failed submits.", "Submit again, or reveal a hint spell first.");
			}

			const view = this.seerStoneRules.viewSolution(this.progress.seerStones, spendStone, this.clock.now());

			await this.commit((progress) => ({
				...this.withQuest(progress, questId, { solutionViewed: true, seerStoneSpent: current.seerStoneSpent || view.stoneSpent }),
				seerStones: view.stonesAfter,
				rematches: { ...progress.rematches, [questId]: view.rematchDueAt },
			}));

			return view;
		});
	}

	/** Records one graded attempt and returns everything the loot screen shows. `allQuests` is every loaded quest, for unlocks. */
	recordAttempt(input: AttemptInput, allQuests: RuleQuest[]): Promise<AttemptOutcome>
	{
		return this.enqueue(async () =>
		{
			const now = this.clock.now();
			const unlockBaseline = this.progress;
			const before = (input.itemReviews ?? []).reduce((progress, review) => this.applyReview(progress, review.itemId, review.quality, review.context ?? {}, now).progress, this.progress);
			const { quest } = input;
			const questBefore = this.questProgressOf(before, quest.id);
			const previouslyPassed = questBefore.status === "passed";
			const rematchDueAt = before.rematches[quest.id];
			const isRematch = input.passed && rematchDueAt !== undefined && new Date(rematchDueAt).getTime() <= now.getTime();
			const levelBefore = this.levelRules.levelForXp(before.xp);

			const countsForSpree = input.isSubmit && (quest.kind === "build" || quest.kind === "refactor") && !previouslyPassed;
			const spreeUpdate = this.spreeRules.applySubmit(before.spree, { countsForSpree, firstSubmit: questBefore.attempts === 0, passed: input.passed });

			const result: AttemptResultKind = input.passed ? "passed" : input.compiled ? "failed-compiled" : "failed";
			const xp = this.xpRules.questXp({
				baseXp: quest.xp,
				difficulty: quest.difficulty,
				level: levelBefore,
				kind: quest.kind,
				result,
				previouslyPassed,
				isRematch,
				hintsRevealed: questBefore.hintsRevealed,
				solutionViewedWithoutStone: questBefore.solutionViewed && !questBefore.seerStoneSpent,
				effortAlreadyGranted: questBefore.effortXpGranted,
				spreeAfter: countsForSpree ? spreeUpdate.spree.current : 0,
				potionActive: this.potionActive(before, now),
			});

			let next: PlayerProgress = { ...before, spree: spreeUpdate.spree, xp: before.xp + xp.total };
			const questAfter: QuestProgress = {
				...questBefore,
				status: input.passed || previouslyPassed ? "passed" : "in_progress",
				attempts: questBefore.attempts + 1,
				bestScore: Math.max(questBefore.bestScore ?? 0, input.score),
				effortXpGranted: questBefore.effortXpGranted || xp.effort > 0,
				lastAttemptAt: now.toISOString(),
			};
			next.quests = { ...next.quests, [quest.id]: questAfter };

			let cardChanges: AttemptOutcome["cardChanges"] = [];
			let skillChanges: AttemptOutcome["skillChanges"] = [];
			let streak: AttemptOutcome["streak"] = { count: this.streakRules.countAt(before.streak, now) };
			let chest: ChestReward | undefined;
			let monthBadge: string | undefined;

			if (input.passed)
			{
				const cards = this.cardRules.applyPass(next.patternCards, quest.id, quest.patterns);
				next.patternCards = cards.cards;
				cardChanges = cards.changes;

				if (!previouslyPassed || isRematch)
				{
					const skills = this.skillRules.applyPass(next.skills, quest.skills, quest.difficulty, quest.kind === "boss");
					next.skills = skills.skills;
					skillChanges = skills.changes;
				}

				if (isRematch)
				{
					const { [quest.id]: _done, ...remaining } = next.rematches;
					next.rematches = remaining;
					next = this.reviewRematchItems(next, quest, input.score, now);
				}

				if (quest.kind === "boss" && !previouslyPassed) next = this.applyBossRewards(next, quest.id);

				const streakUpdate = this.streakRules.recordActivity(next.streak, now);
				next.streak = streakUpdate.streak;
				streak = streakUpdate.milestoneReached === undefined ? { count: streakUpdate.streak.count } : { count: streakUpdate.streak.count, milestoneReached: streakUpdate.milestoneReached };

				const dailyKind = quest.kind === "concept" ? "concept" : quest.kind === "build" ? "build" : null;
				if (dailyKind)
				{
					const completion = this.dailyQuest.complete(next.daily, now, dailyKind, quest.id);
					next.daily = completion.state;
					monthBadge = completion.monthBadge;

					if (completion.completedNow)
					{
						chest = this.chestRules.roll(next, this.random);
						next = this.applyChest(next, chest, now);
					}
				}
			}

			const levelAfter = this.levelRules.levelForXp(next.xp);
			next.role = this.levelRules.roleForLevel(levelAfter);

			const attempt = { attemptId: `attempt-${before.attempts.length + 1}`, questId: quest.id, at: now.toISOString(), score: input.score, passed: input.passed, xpGained: xp.total };
			next.attempts = [...next.attempts, attempt];

			const unlockedQuestIds = new UnlockGraph(allQuests).newlyUnlocked(this.unlockState(unlockBaseline), this.unlockState(next));

			await this.commit(() => next);

			const outcome: AttemptOutcome = {
				attempt,
				xp,
				level: { before: levelBefore, after: levelAfter },
				role: { before: this.levelRules.roleForLevel(levelBefore), after: next.role },
				cardChanges,
				skillChanges,
				spree: { current: next.spree.current, best: next.spree.best, armorUsed: spreeUpdate.armorUsed },
				streak,
				unlockedQuestIds,
				nextDueDates: this.nextDueDates(next),
			};
			if (chest) outcome.chest = chest;
			if (monthBadge) outcome.monthBadge = monthBadge;

			return outcome;
		});
	}

	/** Reviews one drill or concept item with SM-2 quality 0 to 5: updates its schedule, mastery, the review log, and its skill's mastery. */
	reviewItem(itemId: string, quality: number, context: ReviewContext = {}): Promise<DrillItemResult>
	{
		return this.enqueue(async () =>
		{
			const { progress: next, result } = this.applyReview(this.progress, itemId, quality, context, this.clock.now());

			await this.commit(() => next);

			return result;
		});
	}

	/** Ends a drill: flat drill XP, the streak, the daily offer and its chest. A test-out drill (`testOutWorldId`) tests the world out when every term of it is still at proficient afterwards (A313). */
	finishDrill(totals: DrillTotals, allQuests: RuleQuest[], testOutWorldId?: string): Promise<DrillOutcome>
	{
		return this.enqueue(async () =>
		{
			const now = this.clock.now();
			const xpGained = this.xpRules.drillXp(this.potionActive(this.progress, now));
			const streakUpdate = this.streakRules.recordActivity(this.progress.streak, now);

			let next: PlayerProgress = { ...this.progress, xp: this.progress.xp + xpGained, streak: streakUpdate.streak };
			next.role = this.levelRules.roleForLevel(this.levelRules.levelForXp(next.xp));

			const completion = this.dailyQuest.complete(next.daily, now, "drill");
			next.daily = completion.state;

			let chest: ChestReward | undefined;
			if (completion.completedNow)
			{
				chest = this.chestRules.roll(next, this.random);
				next = this.applyChest(next, chest, now);
			}

			const worldQuests = allQuests.filter((quest) => quest.worldId === testOutWorldId);
			const testedOut = testOutWorldId === undefined ? [] : this.testOutRules.testedOutWorlds(worldQuests, (itemId) => next.memory[itemId]?.mastery);
			const testedOutWorldIds = testedOut.filter((worldId) => !next.testedOutWorldIds.includes(worldId));
			next.testedOutWorldIds = [...next.testedOutWorldIds, ...testedOutWorldIds];

			await this.commit(() => next);

			const outcome: DrillOutcome = {
				xpGained,
				streak: streakUpdate.milestoneReached === undefined ? { count: streakUpdate.streak.count } : { count: streakUpdate.streak.count, milestoneReached: streakUpdate.milestoneReached },
				correctCount: totals.correctCount,
				totalCount: totals.totalCount,
				nextDueAt: this.nextDueDates(next)[0] ?? null,
				testedOutWorldIds,
			};
			if (chest) outcome.chest = chest;
			if (completion.monthBadge) outcome.monthBadge = completion.monthBadge;

			return outcome;
		});
	}

	/** Availability of every quest for the World Map. Due items first surface as rematches of passed quests in other worlds. */
	getQuestAvailability(allQuests: RuleQuest[]): Promise<Record<string, QuestAvailability>>
	{
		return this.enqueue(async () =>
		{
			const graph = new UnlockGraph(allQuests);
			const now = this.clock.now();
			const rematches = { ...this.progress.rematches };
			const availabilityBefore = graph.availability(this.unlockState(this.progress));

			// Only scheduled due items surface rematches; "Drill me" and hover-injected items would stay due after the replay and could be farmed.
			for (const itemId of this.drillScheduler.scheduledDueToday(this.progress, now))
			{
				const questId = this.rematchSelector.select(itemId, this.progress.memory[itemId]?.earnedInWorldId, allQuests, availabilityBefore);

				if (questId && !(questId in rematches)) rematches[questId] = now.toISOString();
			}

			if (Object.keys(rematches).length !== Object.keys(this.progress.rematches).length) await this.commit((progress) => ({ ...progress, rematches }));

			return graph.availability(this.unlockState(this.progress));
		});
	}

	/** Keeps the breakdown plan as first submitted (before a reference plan is shown) and autosaves it as the draft. */
	saveSubmittedPlan(questId: string, plan: BreakdownPlan): Promise<void>
	{
		return this.enqueue(async () =>
		{
			await this.commit((progress) =>
			{
				const quest = this.questProgressOf(progress, questId);
				const status = quest.status === "passed" ? "passed" : "in_progress";

				return this.withQuest(progress, questId, { status, submittedPlan: structuredClone(plan), breakdownPlan: structuredClone(plan) });
			});
		});
	}

	/** Keeps the revised plan and the revision note of a breakdown (used for a boss breakdown, which passes with its integration build, A317). */
	saveRevision(questId: string, plan: BreakdownPlan, revisionNote: string): Promise<void>
	{
		return this.enqueue(async () =>
		{
			await this.commit((progress) => this.withQuest(progress, questId, { breakdownPlan: structuredClone(plan), revisionNote }));
		});
	}

	/** The loot screen's view when nothing was earned: current level, role, spree, streak, and next due dates. */
	unchangedOutcome(questId: string, score: number): AttemptOutcome
	{
		this.ensureAvailable();

		const now = this.clock.now();
		const level = this.levelRules.levelForXp(this.progress.xp);
		const xp = this.xpRules.questXp({ baseXp: 0, difficulty: 1, level, kind: "boss", result: "failed", previouslyPassed: false, isRematch: false, hintsRevealed: 0, solutionViewedWithoutStone: false, effortAlreadyGranted: false, spreeAfter: 0, potionActive: false });

		return {
			attempt: { attemptId: "none", questId, at: now.toISOString(), score, passed: false, xpGained: 0 },
			xp,
			level: { before: level, after: level },
			role: { before: this.progress.role, after: this.progress.role },
			cardChanges: [],
			skillChanges: [],
			spree: { current: this.progress.spree.current, best: this.progress.spree.best, armorUsed: false },
			streak: { count: this.streakRules.countAt(this.progress.streak, now) },
			unlockedQuestIds: [],
			nextDueDates: this.nextDueDates(this.progress),
		};
	}

	/** The drill outcome when a session ends without earning anything (an unfinished drill or the Parsons fallback): no XP, streak unchanged. */
	unrewardedDrillOutcome(totals: DrillTotals): DrillOutcome
	{
		this.ensureAvailable();

		return {
			xpGained: 0,
			streak: { count: this.streakRules.countAt(this.progress.streak, this.clock.now()) },
			correctCount: totals.correctCount,
			totalCount: totals.totalCount,
			nextDueAt: this.nextDueDates(this.progress)[0] ?? null,
			testedOutWorldIds: [],
		};
	}

	/** Today's daily quest, with fresh offers on a new day. */
	getDailyQuest(candidates: DailyCandidates): Promise<DailyQuestState>
	{
		return this.enqueue(async () =>
		{
			const refreshed = this.dailyQuest.refresh(this.progress.daily, this.clock.now(), candidates, this.random);

			if (refreshed !== this.progress.daily) await this.commit((progress) => ({ ...progress, daily: refreshed }));

			return structuredClone(this.progress.daily);
		});
	}

	/** Chooses one of today's daily offers (once per day). */
	chooseDailyOffer(index: number): Promise<DailyQuestState>
	{
		return this.enqueue(async () =>
		{
			const chosen = this.dailyQuest.choose(this.progress.daily, index);

			if (!chosen) throw new AppErrorException("invalid-payload", "Today's daily quest is already chosen, or that offer does not exist.", "Finish the chosen offer, or come back tomorrow for new ones.");

			await this.commit((progress) => ({ ...progress, daily: chosen }));

			return structuredClone(this.progress.daily);
		});
	}

	/** One review applied to a save: scheduler, memory, schedule, review log, Drill me queue, and the item's skill mastery. */
	private applyReview(progress: PlayerProgress, itemId: string, quality: number, context: ReviewContext, now: Date): { progress: PlayerProgress; result: DrillItemResult }
	{
		const scheduled = this.scheduler.review(itemId, progress.memory[itemId], quality, now);
		const memory = { ...scheduled.memory };

		if (context.skillId) memory.skillId = context.skillId;
		if (context.earnedInWorldId && !memory.earnedInWorldId) memory.earnedInWorldId = context.earnedInWorldId;

		let next: PlayerProgress = {
			...progress,
			memory: { ...progress.memory, [itemId]: memory },
			schedule: { ...progress.schedule, [itemId]: scheduled.dueAt },
			reviewLog: [...progress.reviewLog, scheduled.logEntry],
			drillQueue: progress.drillQueue.filter((queued) => queued !== itemId),
		};

		const result: DrillItemResult = { itemId, correct: scheduled.successful, quality, nextDueAt: scheduled.dueAt };
		const skillId = memory.skillId;

		if (skillId)
		{
			const levels = Object.values(next.memory).filter((itemMemory) => itemMemory.skillId === skillId).map((itemMemory) => itemMemory.mastery);
			const masteryAfter = this.skillRules.masteryFromItems(levels);
			const existing = next.skills[skillId];
			const masteryBefore: MasteryLevel = existing?.mastery ?? "attempted";

			next = { ...next, skills: { ...next.skills, [skillId]: { points: existing?.points ?? 0, mastery: masteryAfter } } };

			if (masteryBefore !== masteryAfter) result.masteryChange = { skillId, before: masteryBefore, after: masteryAfter };
		}

		return { progress: next, result };
	}

	/** Reviews the due terms and patterns a passed rematch exercised, so they move to their next interval and cannot surface the same rematch again today. */
	private reviewRematchItems(progress: PlayerProgress, quest: RuleQuest, score: number, now: Date): PlayerProgress
	{
		const dueToday = new Set(this.drillScheduler.scheduledDueToday(progress, now));
		const quality = this.sm2Quality.qualityFromScore(score, true);
		let next = progress;

		for (const itemId of new Set([...quest.terms, ...quest.patterns]))
		{
			if (dueToday.has(itemId)) next = this.applyReview(next, itemId, quality, {}, now).progress;
		}

		return next;
	}

	/** Runs one read, compute, and commit step after every earlier one has finished, so no step works from a state that is about to be replaced. A failed step does not block later ones. */
	private enqueue<Result>(step: () => Promise<Result>): Promise<Result>
	{
		const run = this.pendingMutation.catch(() => undefined).then(() =>
		{
			this.ensureAvailable();

			return step();
		});

		this.pendingMutation = run;

		return run;
	}

	/** Throws the refusal when the save could not be opened, so a refused service never overwrites the file it could not read. */
	private ensureAvailable(): void
	{
		if (this.refusal) throw new AppErrorException(this.refusal.code, this.refusal.message, this.refusal.suggestedAction, this.refusal.detail);
	}

	/** Applies a change, stamps `updatedAt`, saves, and only then keeps it in memory, so memory never runs ahead of the disk. */
	private async commit(change: (progress: PlayerProgress) => PlayerProgress): Promise<void>
	{
		const next = { ...change(this.progress), updatedAt: this.clock.now().toISOString() };

		await this.store.save(next);
		this.progress = next;
	}

	/** A quest's progress, or a fresh one. */
	private questProgressOf(progress: PlayerProgress, questId: string): QuestProgress
	{
		return progress.quests[questId] ?? createNewQuestProgress();
	}

	/** The save with some fields of one quest changed. */
	private withQuest(progress: PlayerProgress, questId: string, fields: Partial<QuestProgress>): PlayerProgress
	{
		return { ...progress, quests: { ...progress.quests, [questId]: { ...this.questProgressOf(progress, questId), ...fields } } };
	}

	/** First boss pass: one freeze, one armor, and the boss's module in the studio's engine room. */
	private applyBossRewards(progress: PlayerProgress, bossQuestId: string): PlayerProgress
	{
		const modules = progress.studio.modules.includes(bossQuestId) ? progress.studio.modules : [...progress.studio.modules, bossQuestId];

		return {
			...progress,
			streak: this.streakRules.earnFreeze(progress.streak),
			spree: this.spreeRules.earnArmor(progress.spree),
			studio: { ...progress.studio, modules },
		};
	}

	/** Gives a chest reward. */
	private applyChest(progress: PlayerProgress, reward: ChestReward, now: Date): PlayerProgress
	{
		switch (reward)
		{
			case "freeze":
				return { ...progress, streak: this.streakRules.earnFreeze(progress.streak) };
			case "armor":
				return { ...progress, spree: this.spreeRules.earnArmor(progress.spree) };
			case "seer-stone":
				return { ...progress, seerStones: this.seerStoneRules.earnStone(progress.seerStones) };
			case "studio-cosmetic":
			{
				const cosmetic = this.chestRules.nextCosmetic(progress);

				return cosmetic ? { ...progress, studio: { ...progress.studio, cosmetics: [...progress.studio.cosmetics, cosmetic] } } : progress;
			}
			case "xp-potion":
				return { ...progress, xpPotionUntil: addMinutes(now, XP_POTION.minutes).toISOString() };
		}
	}

	/** True while an XP potion is active. */
	private potionActive(progress: PlayerProgress, now: Date): boolean
	{
		return progress.xpPotionUntil !== null && new Date(progress.xpPotionUntil).getTime() > now.getTime();
	}

	/** The state the unlock graph reads from a save. */
	private unlockState(progress: PlayerProgress): UnlockState
	{
		return {
			now: this.clock.now(),
			quests: progress.quests,
			masteryOf: (itemId) => progress.memory[itemId]?.mastery,
			testedOutWorldIds: progress.testedOutWorldIds,
			rematches: progress.rematches,
		};
	}

	/** The next three due times, soonest first. */
	private nextDueDates(progress: PlayerProgress): string[]
	{
		return Object.values(progress.schedule).sort().slice(0, 3);
	}
}
