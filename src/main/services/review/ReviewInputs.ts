// What each grader needs to know about a quest and the learner's answer. Plain data the submit and drill flows build from content and progress.
import type { BreakdownPieceKind, BreakdownPlan } from "@shared/types/progress";
import type { ReviewFinding } from "@shared/types/review";
import type { RunResult } from "@shared/types/run";

/** Everything the code reviewer reads for one build or refactor submit. */
export interface CodeReviewInput
{
	/** The quest id, for example `w1.health-component`. */
	questId: string;

	/** The quest title shown to the learner. */
	questTitle: string;

	/** The quest brief (markdown). */
	brief: string;

	/** The quest's rubric lines, in order. Every line gets a met or not met answer. */
	rubric: string[];

	/** Patterns the quest names (for example "Observer"), so the reviewer judges their use. Empty when none. */
	patternNames: string[];

	/** The learner's files by file name. */
	files: Record<string, string>;

	/** The engine's verdict for this submit. */
	run: RunResult;
}

/** One piece the quest requires in every valid breakdown plan. */
export interface RequiredPieceInput
{
	/** What kind of piece it is. */
	kind: BreakdownPieceKind;

	/** The piece's label, for example "HealthComponent". */
	label: string;

	/** Why the plan needs it. */
	why: string;
}

/** Everything the breakdown grader reads for one revised plan. */
export interface BreakdownGradeInput
{
	/** The breakdown or boss quest id. */
	questId: string;

	/** The finished mechanic or system and its acceptance criteria (markdown). */
	spec: string;

	/** Pieces every valid plan must cover. */
	requiredPieces: RequiredPieceInput[];

	/** The quest's reference plans (two or more). */
	referencePlans: BreakdownPlan[];

	/** Extra rubric lines from the quest. */
	rubric: string[];

	/** The learner's plan before seeing a reference plan, when it was saved. */
	firstPlan?: BreakdownPlan;

	/** The learner's plan after the revision. This is what is graded. */
	revisedPlan: BreakdownPlan;

	/** The learner's note on what changed and why. */
	revisionNote: string;
}

/** Everything the explain grader reads for one learner sentence. */
export interface ExplainGradeInput
{
	/** What the learner was asked to explain, for example "Explain UPROPERTY in one sentence." */
	prompt: string;

	/** The quest's model answer. Absent for reflection questions, which have none. */
	modelAnswer?: string;

	/** Extra grading lines from the item, when it has any. */
	rubric?: string[];

	/** Background the grader may need, for example the code review a reflection question came from. */
	context?: string;

	/** The learner's sentence. */
	answer: string;
}

/** Everything the reflection grader reads for one answer to a review's reflection question (A853). */
export interface ReflectionGradeInput
{
	/** The review's reflection question. */
	question: string;

	/** The review's summary, for context. */
	reviewSummary: string;

	/** The learner's submitted files the question is about (the capped copy stored on the attempt). */
	files: Record<string, string>;

	/** The learner's sentence. */
	answer: string;
}

/** Everything the finding explainer reads to answer "why is this a finding?". */
export interface FindingExplanationInput
{
	/** Cache key, unique per finding, for example `<attemptId>:<findingIndex>`. */
	cacheKey: string;

	/** The quest brief, so the explanation can refer to it. */
	brief: string;

	/** The finding to explain. */
	finding: ReviewFinding;

	/** The learner's files the finding is about. */
	files: Record<string, string>;
}
