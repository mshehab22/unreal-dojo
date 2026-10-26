// The review that always works: deterministic answers built from test results, the rubric, and label matching, with no AI involved.
import type { BreakdownPlan } from "@shared/types/progress";
import type { BreakdownGrade, CodeReview, ExplainGrade, ReviewFinding, ReviewProviderStatus } from "@shared/types/review";

import { normalizeLabel } from "../graders/BreakdownGrader";
import type { BreakdownGradeInput, CodeReviewInput, ExplainGradeInput, FindingExplanationInput } from "../ReviewInputs";

/** What a learner can do to get a full review, said in every tests-only answer. */
const SET_UP_AI_NOTE = "An AI reviewer can check this for you once Claude Code or an API key is set up in Settings.";

/** Score the explain grader gives when nothing can judge the sentence. The learner self-checks; the scheduler treats it as a plain pass. */
const SELF_CHECK_SCORE = 70;

/** Shortest learner label that may match as part of a longer required label, so "A" or "UI" never covers every piece (A158). */
const MINIMUM_PARTIAL_LABEL_LENGTH = 4;

/** Words that say what kind of piece a label is, not what it does. A partial match ignores them and their plurals, so "Component" never covers "HealthComponent" and "Steps" never covers "SetupSteps" (A302). */
export const KIND_WORDS: ReadonlySet<string> = new Set([
	"component", "actor", "class", "object", "event", "delegate", "data", "asset", "struct", "step",
	"system", "subsystem", "manager", "controller", "handler", "service", "interface", "widget", "base", "on",
]);

/** Splits a label into lower-case words: "OnDeath event" gives on, death, event; "UHealthComponent" gives u, health, component. */
function labelWords(label: string): string[]
{
	return (label.match(/[A-Z]?[a-z]+|[A-Z]+(?![a-z])|\d+/g) ?? []).map((word) => word.toLowerCase());
}

/** True for a kind word or its plural: "systems", "classes", and "widgets" count like "system", "class", and "widget". */
export function isKindWord(word: string): boolean
{
	if (KIND_WORDS.has(word)) return true;
	if (word.endsWith("es") && KIND_WORDS.has(word.slice(0, -2))) return true;

	return word.endsWith("s") && KIND_WORDS.has(word.slice(0, -1));
}

/** The part of a label that names its job: every word except kind words (singular or plural) and one-letter Unreal prefixes, joined. "HealthComponent" gives "health". */
export function labelCore(label: string): string
{
	return labelWords(label).filter((word) => word.length > 1 && !isKindWord(word)).join("");
}

/**
 * True when a learner label names a required piece (A158, A302):
 * - it contains the whole required label ("PlayerHealthComponent" covers "HealthComponent"), or
 * - its core (kind words removed) is part of the required label's core, at least 4 characters long, and at least half the required core's length
 *   ("Health" covers "HealthComponent", "Door" covers "DoorActor", "Component", "UI", and "Heal" for "HealthBarWidget" do not).
 */
export function labelMatches(learnerLabel: string, requiredLabel: string): boolean
{
	const learnerKey = normalizeLabel(learnerLabel);
	const requiredKey = normalizeLabel(requiredLabel);
	if (learnerKey.length === 0 || requiredKey.length === 0) return false;
	if (learnerKey.includes(requiredKey)) return true;

	const learnerCore = labelCore(learnerLabel);
	const requiredCore = labelCore(requiredLabel);
	if (learnerCore.length < MINIMUM_PARTIAL_LABEL_LENGTH || requiredCore.length === 0) return false;

	return requiredCore.includes(learnerCore) && learnerCore.length * 2 >= requiredCore.length;
}

/** Why tests-only answered instead of an AI provider, and whether a retry is worth offering. */
export interface TestsOnlyFallback
{
	/** Plain-English reason, copied to the answer's `fallbackReason`. */
	reason?: string;

	/** True when the AI reviewer timed out, so the screen offers "Retry review" (A300). */
	retryReviewSuggested?: boolean;
}

/** Adds the fallback reason and retry hint to a tests-only answer when there are any. */
function withReason<Answer extends object>(answer: Answer, fallback: TestsOnlyFallback = {}): Answer & { fallbackReason?: string; retryReviewSuggested?: boolean }
{
	return {
		...answer,
		...(fallback.reason ? { fallbackReason: fallback.reason } : {}),
		...(fallback.retryReviewSuggested ? { retryReviewSuggested: true } : {}),
	};
}

/** Counts the labels two plans share, after normalizing. */
function sharedLabelCount(left: BreakdownPlan, right: BreakdownPlan): number
{
	const rightLabels = new Set(right.pieces.map((piece) => normalizeLabel(piece.label)));

	return left.pieces.filter((piece) => rightLabels.has(normalizeLabel(piece.label))).length;
}

/** Answers every grader without AI. Used when no AI provider is available or tests-only is chosen in Settings. */
export class TestsOnlyProvider
{
	/** Which provider this is. */
	readonly id = "tests-only" as const;

	/** Always available. */
	async status(): Promise<ReviewProviderStatus>
	{
		return { id: this.id, available: true };
	}

	/** Turns the test results into findings and each rubric line into a self-check. Score is the share of tests passed, as the rules expect (review = tests). */
	reviewCode(input: CodeReviewInput, fallback?: TestsOnlyFallback): CodeReview
	{
		const { run } = input;
		const score = run.testsTotal > 0 ? Math.round((run.testsPassed / run.testsTotal) * 100) : (run.ok ? 100 : 0);

		const failedTests: ReviewFinding[] = run.tests.filter((test) => !test.passed).map((test) => ({
			severity: "problem",
			title: `Test failed: ${test.name.split(".").pop() ?? test.name}`,
			detail: test.message ?? "The test failed without a message. Read the test's name and the brief to see what it expects.",
		}));

		const selfChecks: ReviewFinding[] = input.rubric.map((line) => ({ severity: "suggestion", title: `Self-check: ${line}`, detail: `Read your code against this rubric line yourself. ${SET_UP_AI_NOTE}` }));
		const praise: ReviewFinding[] = run.ok ? [{ severity: "praise", title: "Every test passed", detail: "The engine's tests agree your code does what the brief asks." }] : [];

		const testSentence = run.testsTotal > 0 ? `${run.testsPassed} of ${run.testsTotal} tests passed.` : "No tests ran.";

		return withReason({
			score,
			summary: `${testSentence} No AI reviewer checked the code, so the rubric lines are yours to check.`,
			rubric: [],
			findings: [...failedTests, ...praise, ...selfChecks],
			reflectionQuestion: "Which rubric line was hardest to meet, and what did you do about it?",
			alternativeHint: "Read the quest's alternative after you pass and compare it with your approach.",
			provider: this.id,
		}, fallback);
	}

	/** Matches required pieces to the learner's pieces by label (see `labelMatches`) and picks the reference plan that differs most from theirs. */
	gradeBreakdown(input: BreakdownGradeInput, fallback?: TestsOnlyFallback): BreakdownGrade
	{

		const coverage = input.requiredPieces.map((required) =>
		{
			const match = input.revisedPlan.pieces.find((piece) => labelMatches(piece.label, required.label));

			return match ? { label: required.label, covered: true, matchedTo: match.label } : { label: required.label, covered: false };
		});

		const coveredCount = coverage.filter((piece) => piece.covered).length;
		const score = input.requiredPieces.length > 0 ? Math.round((coveredCount / input.requiredPieces.length) * 100) : 100;
		const missing = coverage.filter((piece) => !piece.covered).map((piece) => `No piece in your plan is labeled like "${piece.label}". Check whether one of yours does its job under another name.`);

		let alternativeToShow = 0;
		input.referencePlans.forEach((plan, index) =>
		{
			const current = input.referencePlans[alternativeToShow];
			if (current && sharedLabelCount(input.revisedPlan, plan) < sharedLabelCount(input.revisedPlan, current)) alternativeToShow = index;
		});

		return withReason({
			score,
			summary: `${coveredCount} of ${input.requiredPieces.length} required pieces matched by name. No AI grader checked the plan, so pieces named differently may not have matched. ${SET_UP_AI_NOTE}`,
			requiredPiecesCovered: coverage,
			concerns: missing,
			strengths: coveredCount > 0 ? [`Your plan names ${coveredCount} of the required pieces directly.`] : [],
			revisionQuality: input.revisionNote.trim().length > 0 ? score : 0,
			alternativeToShow,
			provider: this.id,
		}, fallback);
	}

	/** Shows the model answer for the learner to compare against, since nothing can judge the sentence. */
	gradeExplain(input: ExplainGradeInput, fallback?: TestsOnlyFallback): ExplainGrade
	{
		const comparison = input.modelAnswer ? `Self-check against the model answer: ${input.modelAnswer}` : "Self-check: reread your sentence against the question and your code.";

		return withReason<ExplainGrade>({ score: SELF_CHECK_SCORE, verdict: "partly", note: comparison, provider: this.id }, fallback);
	}

	/** Repeats the finding's own detail, since there is no AI to ask, with why no AI answered when there is a reason (A70, A851). */
	explainFinding(input: FindingExplanationInput, fallback: TestsOnlyFallback = {}): string
	{
		return `${input.finding.detail} ${fallback.reason ?? SET_UP_AI_NOTE}`;
	}
}
