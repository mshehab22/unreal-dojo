// Believable answers from the three graders for the fake: the explain grader, the code reviewer, and the breakdown grader.
import type { LearnerQuest } from "@shared/types/catalog";
import type { RequiredPiece } from "@shared/types/content";
import type { BreakdownPlan } from "@shared/types/progress";
import type { BreakdownGrade, CodeReview, ExplainGrade, ReviewProviderId } from "@shared/types/review";
import type { RunResult } from "@shared/types/run";

/** Words too common to count as meaning. */
const COMMON_WORDS = new Set(["the", "and", "that", "this", "with", "from", "into", "only", "every", "when", "then", "than", "there", "their", "they", "have", "must", "would", "could", "about", "before", "after", "which", "something", "thing", "things", "uses", "used"]);

/** The meaningful words of a sentence: lower case, four letters or more, common words left out. */
function meaningWords(text: string): Set<string>
{
	return new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 4 && !COMMON_WORDS.has(word)));
}

/** Grades one sentence against a model answer by shared meaning words: half or more is correct, a quarter is partly. */
export function gradeSentence(answer: string, modelAnswer: string, provider: ReviewProviderId = "claude-code"): ExplainGrade
{
	const expected = meaningWords(modelAnswer);
	const given = meaningWords(answer);
	const shared = [...expected].filter((word) => given.has(word)).length;
	const score = expected.size === 0 ? 0 : Math.min(100, Math.round((shared / expected.size) * 160));

	if (score >= 50) return { score, verdict: "correct", note: "That is the idea: you named what matters and why.", provider };
	if (score >= 25) return { score, verdict: "partly", note: "Part of it. Compare with the model answer for the piece you left out.", provider };

	return { score, verdict: "incorrect", note: "Not yet. Read the model answer and say it again in your own words next time.", provider };
}

/** A code review shaped like the reviewer's: the score follows the tests, every rubric line is judged, and findings come in all three severities. */
export function reviewCode(quest: LearnerQuest, run: RunResult, provider: ReviewProviderId, fallbackReason?: string): CodeReview
{
	const rubric = "rubric" in quest ? quest.rubric : [];
	const testShare = run.testsTotal === 0 ? 0 : run.testsPassed / run.testsTotal;
	const allMet = run.ok;
	const concept = quest.concepts[0] ?? "the idea of this quest";

	const review: CodeReview = {
		score: allMet ? 88 : Math.round(30 + testShare * 30),
		summary: allMet
			? "Clean and readable. The reflected function and the label refresh are in the right places, and the limit comes from the editable property."
			: "The structure is there, but the tests show the behavior is not finished yet. Start with the first failing test.",
		rubric: rubric.map((line, index) => ({ line, met: allMet || index % 2 === 1, note: allMet || index % 2 === 1 ? "Met." : "Not yet: see the failing test." })),
		findings: [
			...(allMet ? [] : [{ severity: "problem" as const, title: "A failing test means unfinished behavior", detail: "Read the failing test's message: it says what the engine expected and what it saw.", file: quest.kind === "build" || quest.kind === "refactor" ? quest.files[0]?.name : undefined, line: 1 }]),
			{ severity: "suggestion", title: "Name the early return", detail: "A one-word comment above the guard says why a downed dummy ignores strikes." },
			{ severity: "praise", title: "One source of truth", detail: "The knock-down limit is read from the property rather than typed again." },
		],
		reflectionQuestion: `In one sentence: "${concept}". Why does that matter for the designer using your class?`,
		alternativeHint: "Look at the alternative below for a version that counts down instead of up.",
		provider,
	};

	if (fallbackReason)
	{
		review.fallbackReason = fallbackReason;
		review.retryReviewSuggested = true;
	}

	return review;
}

/** Splits a label into lower-case words of four letters or more. */
function labelWords(label: string): string[]
{
	return label.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 4 && !COMMON_WORDS.has(word));
}

/** True when a learner piece shares a meaning word with the required piece's label or reason. */
function covers(required: RequiredPiece, plan: BreakdownPlan): string | undefined
{
	const wanted = new Set([...labelWords(required.label), ...labelWords(required.why)]);

	return plan.pieces.find((piece) => [...labelWords(piece.label), ...labelWords(piece.purpose)].some((word) => wanted.has(word)))?.label;
}

/** A breakdown grade: required pieces matched by shared words, the revision note weighed by how much it says, and the other reference plan offered next. */
export function gradeBreakdown(requiredPieces: readonly RequiredPiece[], plan: BreakdownPlan, revisionNote: string, shownPlanIndex: number, planCount: number): BreakdownGrade
{
	const coverage = requiredPieces.map((required) =>
	{
		const matchedTo = covers(required, plan);

		return { label: required.label, covered: matchedTo !== undefined, ...(matchedTo ? { matchedTo } : {}) };
	});

	const coveredShare = coverage.filter((piece) => piece.covered).length / Math.max(1, coverage.length);
	const revisionQuality = Math.min(100, 40 + Math.round(revisionNote.trim().split(/\s+/).length * 3));
	const missing = requiredPieces.filter((_required, index) => !coverage[index]?.covered);

	return {
		score: Math.round(coveredShare * 40 + revisionQuality * 0.6),
		summary: missing.length === 0 ? "Every required piece is on the board, each with a purpose, and the revision note says what changed and why." : `The plan covers ${coverage.length - missing.length} of ${coverage.length} required pieces. The concerns name what is still missing.`,
		requiredPiecesCovered: coverage,
		concerns: missing.map((required) => `${required.label}: ${required.why}`),
		strengths: coverage.filter((piece) => piece.covered).slice(0, 3).map((piece) => `"${piece.matchedTo}" covers ${piece.label.charAt(0).toLowerCase()}${piece.label.slice(1)}.`),
		revisionQuality,
		alternativeToShow: planCount > 1 ? (shownPlanIndex + 1) % planCount : 0,
		provider: "claude-code",
	};
}
