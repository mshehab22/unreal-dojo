// The zod schema a loaded save file must pass. Lists and maps added after the first save version default to empty, so older saves still load.
import { z } from "zod";

import type { BreakdownPlan, DailyQuestState, ItemMemory, PlayerProgress, QuestProgress, ReviewLogEntry } from "@shared/types/progress";
import type { CodeReview } from "@shared/types/review";

/** Mastery levels. */
const masterySchema = z.enum(["attempted", "familiar", "proficient", "mastered"]);

/** An ISO 8601 moment. */
const momentSchema = z.iso.datetime();

/** A saved breakdown board. */
const breakdownPlanSchema: z.ZodType<BreakdownPlan> = z.object({
	pieces: z.array(z.object({ id: z.string(), kind: z.enum(["class", "component", "data", "event", "step"]), label: z.string(), purpose: z.string() })),
	edges: z.array(z.object({ from: z.string(), to: z.string(), kind: z.enum(["owns", "listens-to", "spawns", "then"]) })),
});

/** A code review stored on a Submit attempt (A466). Same fields as `CodeReview`; added after the first save version, so it is optional on the attempt. */
const codeReviewSchema: z.ZodType<CodeReview> = z.object({
	score: z.number(),
	summary: z.string(),
	rubric: z.array(z.object({ line: z.string(), met: z.boolean(), note: z.string() })),
	findings: z.array(z.object({ severity: z.enum(["problem", "suggestion", "praise"]), title: z.string(), detail: z.string(), file: z.string().optional(), line: z.int().optional() })),
	reflectionQuestion: z.string(),
	alternativeHint: z.string(),
	provider: z.enum(["claude-code", "anthropic-api", "tests-only"]),
	fallbackReason: z.string().optional(),
	retryReviewSuggested: z.boolean().optional(),
});

/** One quest's progress. */
const questProgressSchema: z.ZodType<QuestProgress> = z.object({
	status: z.enum(["locked", "available", "in_progress", "passed"]),
	bestScore: z.number().min(0).max(100).nullable(),
	attempts: z.int().min(0),
	hintsRevealed: z.int().min(0),
	revealedHints: z.array(z.int().min(0)),
	solutionViewed: z.boolean(),
	seerStoneSpent: z.boolean().default(false),
	effortXpGranted: z.boolean().default(false),
	savedFiles: z.record(z.string(), z.string()),
	breakdownPlan: breakdownPlanSchema.optional(),
	revisionNote: z.string().optional(),
	submittedPlan: breakdownPlanSchema.optional(),
	lastAttemptAt: momentSchema.nullable(),
});

/** One review log entry. */
const reviewLogEntrySchema: z.ZodType<ReviewLogEntry> = z.object({
	itemId: z.string(),
	at: momentSchema,
	quality: z.int().min(0).max(5),
	intervalDays: z.number().min(0),
	ease: z.number().min(1.3),
	stability: z.number().optional(),
});

/** One item's scheduler state. */
const itemMemorySchema: z.ZodType<ItemMemory> = z.object({
	ease: z.number().min(1.3),
	intervalDays: z.number().min(0),
	repetitions: z.int().min(0),
	mastery: masterySchema,
	skillId: z.string().optional(),
	earnedInWorldId: z.string().optional(),
	lastReviewedAt: momentSchema,
});

/** The daily quest state. */
const dailySchema: z.ZodType<DailyQuestState> = z.object({
	date: z.string(),
	offered: z.array(z.object({ kind: z.enum(["drill", "concept", "build"]), questId: z.string().optional() })),
	chosen: z.int().min(0).optional(),
	done: z.boolean(),
	monthBadges: z.array(z.string()),
	completedDates: z.array(z.string()).default([]),
});

/** The whole save file. */
export const playerProgressSchema: z.ZodType<PlayerProgress> = z.object({
	version: z.int().min(1),
	playerName: z.string(),
	studio: z.object({ name: z.string(), modules: z.array(z.string()), cosmetics: z.array(z.string()).default([]) }),
	xp: z.int().min(0),
	role: z.string(),
	streak: z.object({ count: z.int().min(0), lastActivityAt: momentSchema.nullable(), freezes: z.int().min(0), milestones: z.array(z.int()) }),
	spree: z.object({ current: z.int().min(0), best: z.int().min(0), armor: z.int().min(0) }),
	seerStones: z.int().min(0),
	patternCards: z.record(z.string(), z.object({ tier: z.enum(["bronze", "silver", "gold"]), useCasesPassed: z.array(z.string()) })),
	skills: z.record(z.string(), z.object({ points: z.number().min(0), mastery: masterySchema })),
	quests: z.record(z.string(), questProgressSchema),
	attempts: z.array(z.object({ attemptId: z.string(), questId: z.string(), at: momentSchema, score: z.number(), passed: z.boolean(), xpGained: z.int(), review: codeReviewSchema.optional(), files: z.record(z.string(), z.string()).optional() })),
	reviewLog: z.array(reviewLogEntrySchema),
	schedule: z.record(z.string(), momentSchema),
	memory: z.record(z.string(), itemMemorySchema).default({}),
	drillQueue: z.array(z.string()).default([]),
	rematches: z.record(z.string(), momentSchema).default({}),
	testedOutWorldIds: z.array(z.string()).default([]),
	xpPotionUntil: momentSchema.nullable().default(null),
	hoverCounts: z.record(z.string(), z.int().min(0)),
	daily: dailySchema,
	createdAt: momentSchema,
	updatedAt: momentSchema,
});
