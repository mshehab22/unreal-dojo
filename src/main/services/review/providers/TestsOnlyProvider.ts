// The review that always works: deterministic answers built from test results, the rubric, and label matching, with no AI involved.
import type { BreakdownPlan } from "@shared/types/progress";
import type { BreakdownGrade, CodeReview, ExplainGrade, ReviewFinding, ReviewProviderStatus } from "@shared/types/review";

import { normalizeLabel } from "../graders/BreakdownGrader";
import type { BreakdownGradeInput, CodeReviewInput, ExplainGradeInput, FindingExplanationInput } from "../ReviewInputs";

/** What a learner can do to get a full review, said in every tests-only answer. */
const SET_UP_AI_NOTE = "An AI reviewer can check this for you once Claude Code or an API key is set up in Settings.";

/** Score the explain grader gives when nothing can judge the sentence. The learner self-checks; the scheduler treats it as a plain pass. */
const SELF_CHECK_SCORE = 70;

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
	reviewCode(input: CodeReviewInput): CodeReview
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

		return {
			score,
			summary: `${testSentence} No AI reviewer checked the code, so the rubric lines are yours to check.`,
			rubric: [],
			findings: [...failedTests, ...praise, ...selfChecks],
			reflectionQuestion: "Which rubric line was hardest to meet, and what did you do about it?",
			alternativeHint: "Read the quest's alternative after you pass and compare it with your approach.",
			provider: this.id,
		};
	}

	/** Matches required pieces to the learner's pieces by label and picks the reference plan that differs most from theirs. */
	gradeBreakdown(input: BreakdownGradeInput): BreakdownGrade
	{
		const learnerPieces = input.revisedPlan.pieces.map((piece) => ({ label: piece.label, key: normalizeLabel(piece.label) }));

		const coverage = input.requiredPieces.map((required) =>
		{
			const requiredKey = normalizeLabel(required.label);
			const match = learnerPieces.find((piece) => piece.key.length > 0 && (piece.key.includes(requiredKey) || requiredKey.includes(piece.key)));

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

		return {
			score,
			summary: `${coveredCount} of ${input.requiredPieces.length} required pieces matched by name. No AI grader checked the plan, so pieces named differently may not have matched. ${SET_UP_AI_NOTE}`,
			requiredPiecesCovered: coverage,
			concerns: missing,
			strengths: coveredCount > 0 ? [`Your plan names ${coveredCount} of the required pieces directly.`] : [],
			revisionQuality: input.revisionNote.trim().length > 0 ? score : 0,
			alternativeToShow,
			provider: this.id,
		};
	}

	/** Shows the model answer for the learner to compare against, since nothing can judge the sentence. */
	gradeExplain(input: ExplainGradeInput): ExplainGrade
	{
		const comparison = input.modelAnswer ? `Self-check against the model answer: ${input.modelAnswer}` : "Self-check: reread your sentence against the question and your code.";

		return { score: SELF_CHECK_SCORE, verdict: "partly", note: comparison, provider: this.id };
	}

	/** Repeats the finding's own detail, since there is no AI to ask. */
	explainFinding(input: FindingExplanationInput): string
	{
		return `${input.finding.detail} ${SET_UP_AI_NOTE}`;
	}
}
