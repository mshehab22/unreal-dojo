// The learner's save file and everything the rules return after an attempt. See docs/systems/progress-and-rules.md.

import type { BreakdownGrade, CodeReview, ExplainGrade, ReflectionRecord } from "./review";
import type { RunResult } from "./run";

/** Where a quest stands for this learner. */
export type QuestStatus = "locked" | "available" | "in_progress" | "passed";

/** Card frame earned by passing distinct use-case quests of a pattern: 1 bronze, 3 silver, 5 gold. */
export type PatternCardTier = "bronze" | "silver" | "gold";

/** Skill mastery from the scheduler. It can fall one level on a missed mixed drill. */
export type MasteryLevel = "attempted" | "familiar" | "proficient" | "mastered";

/** The kind of a piece on the breakdown board. */
export type BreakdownPieceKind = "class" | "component" | "data" | "event" | "step";

/** The kind of an arrow between two breakdown pieces. */
export type BreakdownEdgeKind = "owns" | "listens-to" | "spawns" | "then";

/** One piece the learner placed on the breakdown board. */
export interface BreakdownPiece
{
	/** Board-local id. */
	id: string;

	/** What kind of piece it is. */
	kind: BreakdownPieceKind;

	/** Short name, for example "HealthComponent". */
	label: string;

	/** Purpose label (required): what the piece is for, in the learner's words. */
	purpose: string;
}

/** One arrow between two breakdown pieces. */
export interface BreakdownEdge
{
	/** Id of the piece the arrow starts at. */
	from: string;

	/** Id of the piece the arrow points to. */
	to: string;

	/** What the arrow means. */
	kind: BreakdownEdgeKind;
}

/** The learner's whole breakdown board. */
export interface BreakdownPlan
{
	/** Every piece. */
	pieces: BreakdownPiece[];

	/** Every arrow. */
	edges: BreakdownEdge[];
}

/** One learner answer to a concept question or a drill item. The shape depends on the item type. */
export type ItemResponse =
	| { kind: "choice"; choice: string }
	| { kind: "text"; text: string }
	| { kind: "order"; lineIds: string[] };

/** What the save file remembers about one quest. */
export interface QuestProgress
{
	/** Current status. */
	status: QuestStatus;

	/** Best score from 0 to 100, or null before a graded attempt. */
	bestScore: number | null;

	/** How many graded attempts (Submit, concept finish, breakdown grade) there were. */
	attempts: number;

	/** How many hint spells were revealed. */
	hintsRevealed: number;

	/** Indexes of the hint spells revealed, in reveal order, so paid hints come back after a restart (A500). `hintsRevealed` is its length. */
	revealedHints: number[];

	/** True once the reference solution was viewed. */
	solutionViewed: boolean;

	/** True when a Seer Stone was spent to view the solution, so the quest still pays XP. */
	seerStoneSpent: boolean;

	/** True once the 5% effort XP for a failed but compiled attempt was paid (once per quest). */
	effortXpGranted: boolean;

	/** Autosaved learner files by file name. */
	savedFiles: Record<string, string>;

	/** Autosaved breakdown board, for breakdown and boss quests. */
	breakdownPlan?: BreakdownPlan;

	/** The learner's revision note after seeing a reference plan. */
	revisionNote?: string;

	/** The plan as first submitted, before the learner saw a reference plan; graded beside the revision (A316). */
	submittedPlan?: BreakdownPlan;

	/** Worked-level self-explanations: why each marked line exists, keyed by the marked line's key from the quest content. */
	selfExplanations?: Record<string, string>;

	/** When the last attempt happened (ISO 8601). */
	lastAttemptAt: string | null;
}

/** One graded attempt, kept so the Character screen can show history and the review can be followed up. */
export interface AttemptRecord
{
	/** Unique id, used by "why is this a finding?" and the reflection answer. */
	attemptId: string;

	/** The quest attempted. */
	questId: string;

	/** When (ISO 8601). */
	at: string;

	/** Score from 0 to 100. */
	score: number;

	/** True when the attempt passed. */
	passed: boolean;

	/** XP granted by this attempt. */
	xpGained: number;

	/** The code review of a build, refactor, or boss Submit, kept so "why is this a finding?" and the reflection answer can find it by attempt id. */
	review?: CodeReview;

	/** The files submitted, on build, refactor, and boss Submits only, capped and kept for the quest's last five such attempts (A467). */
	files?: Record<string, string>;

	/** The engine's verdict of the Submit, so Retry review can review the stored files again without a new build (A740). Compiler output capped; pruned with `files` and `review`. */
	run?: RunResult;

	/** "Why is this a finding?" answers already given for this attempt's review, by `<findingIndex>:<finding hash>`, so asking again after a reload is free and never paid twice (A851). Pruned with `review`; cleared when Retry review replaces it. */
	explanations?: Record<string, string>;

	/** The learner's answer to the review's reflection question and its grade (A852). Kept when older details are pruned: it is the learner's own sentence. */
	reflection?: ReflectionRecord;
}

/** One spaced review of one item, appended forever so FSRS can replace SM-2 later without a migration. */
export interface ReviewLogEntry
{
	/** The item reviewed (a glossary term, pattern card, Parsons block, or scenario question id). */
	itemId: string;

	/** When (ISO 8601). */
	at: string;

	/** SM-2 quality from 0 to 5. */
	quality: number;

	/** Interval scheduled after this review, in days. */
	intervalDays: number;

	/** SM-2 ease after this review. */
	ease: number;

	/** FSRS stability, once FSRS exists. */
	stability?: number;
}

/** What the scheduler remembers about one review item between reviews. The review log is the history; this is the current state. */
export interface ItemMemory
{
	/** SM-2 ease (2.5 at the start, never below 1.3). */
	ease: number;

	/** Current interval in days (0 before the first successful review). */
	intervalDays: number;

	/** Successful reviews in a row since the last miss. */
	repetitions: number;

	/** Item mastery: rises with spaced recalls, drops one level on a miss. */
	mastery: MasteryLevel;

	/** The skill this item trains, when known, so skill mastery can follow its items. */
	skillId?: string;

	/** The world the item was earned in, so a rematch can come from a different world. */
	earnedInWorldId?: string;

	/** When the item was last reviewed (ISO 8601). */
	lastReviewedAt: string;
}

/** The learner's save file, `<userData>/progress.json`, written atomically by the main process. */
export interface PlayerProgress
{
	/** Save file schema version. */
	version: number;

	/** The learner's display name. */
	playerName: string;

	/** The learner's studio: its name and the engine-room modules earned. */
	studio: { name: string; modules: string[]; cosmetics: string[] };

	/** Total XP. Only rises. */
	xp: number;

	/** Current role name, for example "Apprentice". */
	role: string;

	/** Activity streak: a completed drill or passed quest within every 3 days. */
	streak: { count: number; lastActivityAt: string | null; freezes: number; milestones: number[] };

	/** First-try Submit pass streak on build and refactor quests. */
	spree: { current: number; best: number; armor: number };

	/** Seer Stones held (max 2). */
	seerStones: number;

	/** Pattern cards by pattern id. */
	patternCards: Record<string, { tier: PatternCardTier; useCasesPassed: string[] }>;

	/** Skills by skill id. */
	skills: Record<string, { points: number; mastery: MasteryLevel }>;

	/** Quest progress by quest id. */
	quests: Record<string, QuestProgress>;

	/** Every graded attempt. */
	attempts: AttemptRecord[];

	/** Every spaced review. */
	reviewLog: ReviewLogEntry[];

	/** Next due time (ISO 8601) by item id. */
	schedule: Record<string, string>;

	/** Scheduler state by item id (ease, interval, mastery). */
	memory: Record<string, ItemMemory>;

	/** Items the learner asked to drill next ("Drill me"), oldest first. */
	drillQueue: string[];

	/** Rematch due times (ISO 8601) by quest id: after a viewed solution, or when a due item surfaced the quest. */
	rematches: Record<string, string>;

	/** World keys (`<packId>/<worldId>`, see `worldKeyOf`) whose test-out the learner passed. Their worked and faded build quests may be skipped (A700). */
	testedOutWorldIds: string[];

	/** When the active XP potion runs out (ISO 8601), or null when none is active. */
	xpPotionUntil: string | null;

	/** How many times the learner hovered each glossary term. */
	hoverCounts: Record<string, number>;

	/** Today's daily quest state and earned month badges. */
	daily: DailyQuestState;

	/** When the save was created (ISO 8601). */
	createdAt: string;

	/** When the save was last written (ISO 8601). */
	updatedAt: string;
}

/** Which kind of activity a daily offer is. */
export type DailyOfferKind = "drill" | "concept" | "build";

/** One of the three daily offers. */
export interface DailyOffer
{
	/** Kind of activity. */
	kind: DailyOfferKind;

	/** The quest for concept and build offers. Drill offers have none. */
	questId?: string;
}

/** Today's daily quest: three offers, one chosen, a chest when done, a badge for a full month. */
export interface DailyQuestState
{
	/** Calendar day (YYYY-MM-DD, local time). */
	date: string;

	/** The three offers. */
	offered: DailyOffer[];

	/** Index of the chosen offer, once chosen. */
	chosen?: number;

	/** True once the chosen offer is complete. */
	done: boolean;

	/** Months (YYYY-MM) where every day's daily quest was done. */
	monthBadges: string[];

	/** Every calendar day (YYYY-MM-DD) whose daily quest was done, for the month badge. */
	completedDates: string[];
}

/** Whether a quest can be started, with the reason when it cannot, for the World Map. */
export interface QuestAvailability
{
	/** Current status. */
	status: QuestStatus;

	/** Plain-English reason shown on hover when locked, for example "Pass Health Component first." */
	lockedReason?: string;

	/** True when a due pattern or term surfaced this quest as a rematch. */
	dueForRematch: boolean;

	/** True for a worked or faded build quest in a tested-out world: it may be skipped. */
	skippable: boolean;
}

/** What a chest can hold. */
export type ChestReward = "freeze" | "armor" | "seer-stone" | "studio-cosmetic" | "xp-potion";

/** The key of a world across packs: world ids are only unique inside a pack (A510), so test-out status and saved test-outs use `<packId>/<worldId>` (A700). */
export function worldKeyOf(packId: string, worldId: string): string
{
	return `${packId}/${worldId}`;
}

/** Whether a world's test-out can be taken, for the World Map's test-out button. Keyed by `worldKeyOf(packId, worldId)` in `getTestOutStatus`. */
export interface WorldTestOutStatus
{
	/** True when every term of the world is at least proficient, so its mixed drill can be taken as a test-out. */
	eligible: boolean;

	/** True once the learner passed the world's test-out, so its worked and faded quests can be skipped. Bosses never are. */
	testedOut: boolean;

	/** Plain-English reason when not eligible, for example "3 terms are not proficient yet." */
	reason?: string;
}

/** Itemized XP for the loot screen. Every field is XP, positive or negative. */
export interface XpBreakdown
{
	/** Quest base XP. */
	base: number;

	/** The difficulty band multiplier applied to base (1.30, 1.12, 1.00, 0.60, 0.25). */
	difficultyMultiplier: number;

	/** First-pass XP after the multiplier; 0 on a repeat, half on a rematch. */
	firstPass: number;

	/** Spree bonus (+5% while the spree is 5 or more). */
	spreeBonus: number;

	/** Total hint spell cost (negative). */
	hintCost: number;

	/** Effort XP for a failed but compiled attempt (5%, once per quest). */
	effort: number;

	/** XP potion bonus, when one is active. */
	potionBonus: number;

	/** Sum of everything above. */
	total: number;
}

/** Everything the loot screen animates after a graded attempt. */
export interface AttemptOutcome
{
	/** The recorded attempt. */
	attempt: AttemptRecord;

	/** Itemized XP. */
	xp: XpBreakdown;

	/** Level before and after. */
	level: { before: number; after: number };

	/** Role before and after. */
	role: { before: string; after: string };

	/** Pattern cards unlocked or upgraded. */
	cardChanges: { patternId: string; tierBefore: PatternCardTier | null; tierAfter: PatternCardTier }[];

	/** Skills whose points or mastery changed. */
	skillChanges: { skillId: string; pointsGained: number; masteryBefore: MasteryLevel | null; masteryAfter: MasteryLevel }[];

	/** Spree after the attempt, and whether armor absorbed a miss. */
	spree: { current: number; best: number; armorUsed: boolean };

	/** Streak after the attempt, and a milestone reached by it if any. */
	streak: { count: number; milestoneReached?: number };

	/** Chest earned, if any. */
	chest?: ChestReward;

	/** Month badge (YYYY-MM) earned by finishing the month's last daily quest, if any. */
	monthBadge?: string;

	/** Quest ids newly available because of this attempt. */
	unlockedQuestIds: string[];

	/** The next few due dates (ISO 8601) for the summary. */
	nextDueDates: string[];
}

/** Answer of a build, refactor, or boss integration Submit: the run, the review when it compiled, and the loot. */
export interface SubmitOutcome
{
	/** The engine's verdict. */
	run: RunResult;

	/** The code review. Absent when the build failed (the compiler already said what is wrong). */
	review?: CodeReview;

	/** XP and everything else that changed. */
	outcome: AttemptOutcome;
}

/** What the renderer sends to finish a concept quest. */
export interface ConceptSubmission
{
	/** The concept quest. */
	questId: string;

	/** The guess on the predict question (never penalized). */
	prediction: ItemResponse | null;

	/** One answer per question, in the quest's question order. */
	answers: ItemResponse[];
}

/** Answer of a concept quest: one result per question plus the loot. */
export interface ConceptOutcome
{
	/** Per-question results, in question order. */
	results: DrillItemResult[];

	/** XP and everything else that changed. */
	outcome: AttemptOutcome;
}

/** What the renderer sends for the first breakdown submit, before the learner sees a reference plan. */
export interface BreakdownSubmission
{
	/** The breakdown or boss quest. */
	questId: string;

	/** The learner's plan as it stands. */
	plan: BreakdownPlan;
}

/** What the renderer sends after the learner has seen a reference plan and written a revision note. This one is graded. */
export interface BreakdownRevision
{
	/** The breakdown or boss quest. */
	questId: string;

	/** The plan after revision. */
	revisedPlan: BreakdownPlan;

	/** At least one sentence on what changed and why. */
	revisionNote: string;
}

/** Answer of the first breakdown submit: which reference plan to show beside the learner's plan. */
export interface BreakdownReferenceChoice
{
	/** Index into the quest's reference plans. */
	referencePlanIndex: number;
}

/** Answer of a graded breakdown revision. */
export interface BreakdownOutcome
{
	/** The grader's answer. */
	grade: BreakdownGrade;

	/** XP and everything else that changed. */
	outcome: AttemptOutcome;
}

/** What the renderer sends to autosave a quest in progress. Either field may be left out. */
export interface QuestDraft
{
	/** The quest. */
	questId: string;

	/** Learner files by file name. */
	files?: Record<string, string>;

	/** Breakdown board. */
	breakdownPlan?: BreakdownPlan;

	/** Worked-level self-explanations by marked line key. Replaces the saved set when present. */
	selfExplanations?: Record<string, string>;
}

/** Answer of revealing the next hint spell. */
export interface HintReveal
{
	/** Index of the hint revealed (0 to 2). */
	hintIndex: number;

	/** The hint text from the quest. */
	text: string;

	/** XP this hint will cost on a pass (15% of base). */
	xpCost: number;

	/** Hints revealed so far on this quest. */
	hintsRevealed: number;

	/** True when this hint was already revealed before this call, so nothing new was charged (A501). */
	alreadyRevealed: boolean;
}

/** The scheduler's answer for one drill or concept item. */
export interface DrillItemResult
{
	/** The item answered. */
	itemId: string;

	/** True when the answer was right (for explain items: the grade was correct). False for a self-checked item, which is not a miss: see `selfChecked`. */
	correct: boolean;

	/** True for an explain item only self-checked (tests-only): not graded, not scheduled, and not "due for review" (A801). Absent otherwise. */
	selfChecked?: boolean;

	/** SM-2 quality recorded (0 to 5). */
	quality: number;

	/** Grader answer for explain-in-one-sentence items. */
	explainGrade?: ExplainGrade;

	/** The model answer or the right order, shown after answering. */
	modelAnswer?: string;

	/** Mastery change of the item's skill, when it changed. Shown as "due for review", never as a loss. */
	masteryChange?: { skillId: string; before: MasteryLevel; after: MasteryLevel };

	/** When this item is due next (ISO 8601). */
	nextDueAt: string;
}

/** What the renderer sends to answer one drill item. */
export interface DrillAnswer
{
	/** The drill session from `startDrill`. */
	sessionId: string;

	/** The item answered. */
	itemId: string;

	/** The learner's answer. */
	response: ItemResponse;
}

/** Answer of finishing a drill session. */
export interface DrillOutcome
{
	/** XP granted (flat 10 per completed drill). */
	xpGained: number;

	/** Streak after the drill. */
	streak: { count: number; milestoneReached?: number };

	/** Graded items answered right, out of `totalCount`. */
	correctCount: number;

	/** Graded items in the drill: every item except the self-checked ones. */
	totalCount: number;

	/** Explain items only self-checked because no AI reviewer graded them (tests-only). They are neither right nor wrong and not scheduled, so they are never "due for review" (A318, A460, A801). */
	selfCheckedCount: number;

	/** When the next item is due (ISO 8601), or null when nothing is scheduled. */
	nextDueAt: string | null;

	/** World keys (`<packId>/<worldId>`) whose test-out this drill passed, letting the learner skip their worked and faded quests. */
	testedOutWorldIds: string[];

	/** Chest earned when this drill finished the chosen daily offer. */
	chest?: ChestReward;

	/** Month badge (YYYY-MM) earned by finishing the month's last daily quest, if any. */
	monthBadge?: string;
}

/** Due drill counts for the Studio home. */
export interface DrillSummary
{
	/** Items due today, capped at the daily cap. */
	dueToday: number;

	/** Items that slid to tomorrow because of the cap. */
	overflow: number;

	/** When the next item is due (ISO 8601), or null when nothing is scheduled. */
	nextDueAt: string | null;
}

/** One XP difficulty band and its multiplier, as in the rules table. */
export interface XpBandRule
{
	/** Band name. */
	band: "far-above" | "above" | "at-level" | "below" | "far-below";

	/** Multiplier on base XP. */
	multiplier: number;
}

/** The rule constants the UI shows (thresholds, costs, caps). Read through IPC so the renderer never duplicates rules.ts. */
export interface RulesSnapshot
{
	/** Minimum score to pass a graded quest. */
	passScore: number;

	/** Share of concept questions needed to pass (0.8). */
	conceptPassShare: number;

	/** XP difficulty bands. */
	xpBands: XpBandRule[];

	/** Share of base XP each hint spell costs (0.15). */
	hintCostShare: number;

	/** Share of base XP for a rematch pass (0.5). */
	rematchShare: number;

	/** Flat XP per completed drill. */
	drillXp: number;

	/** Level curve: xp to next level = round(levelCurveBase * levelCurveGrowth ^ (level - 1)). */
	levelCurveBase: number;

	/** See `levelCurveBase`. */
	levelCurveGrowth: number;

	/** Roles and the level each starts at, lowest first. */
	roles: { level: number; name: string }[];

	/** Distinct use-case passes for each card tier. */
	cardTierThresholds: Record<PatternCardTier, number>;

	/** Days the streak survives without activity. */
	streakWindowDays: number;

	/** Streak milestones that are celebrated. */
	streakMilestones: number[];

	/** Most freezes held at once. */
	maxFreezes: number;

	/** Most Seer Stones held at once. */
	maxSeerStones: number;

	/** Spree length where the spree bonus starts. */
	spreeBonusThreshold: number;

	/** Spree bonus share of XP (0.05). */
	spreeBonusShare: number;

	/** Fewest and most items in a drill. */
	drillSize: { min: number; max: number };

	/** Most items due per day. */
	dailyDueCap: number;

	/** Failed submits before the Seer Stone and Parsons fallback offers appear. */
	failedSubmitsBeforeOffers: number;

	/** Most spree armor held at once. */
	maxArmor: number;

	/** Hint spells per quest. */
	hintsPerQuest: number;

	/** Days until the rematch a viewed solution schedules. */
	rematchAfterDays: number;

	/** XP potion bonus share (0.5) and how long it lasts in minutes. */
	xpPotion: { share: number; minutes: number };

	/** Recalls in a row for familiar and proficient, and the interval in days for mastered. */
	masteryThresholds: { familiarRecalls: number; proficientRecalls: number; masteredIntervalDays: number };

	/** Hovers on an unpassed term that push it into the next drill. */
	hoverInjectionThreshold: number;

	/** Share of base XP a failed but compiled build, refactor, or boss attempt pays, once per quest. */
	effortShare: number;

	/** Studio cosmetic ids a chest can hold, in the order they are given. */
	studioCosmetics: string[];
}
