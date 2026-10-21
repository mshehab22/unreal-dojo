// Decides whether an attempt passes, for every quest kind, and combines test and review scores.
import { CONCEPT_PASS_SHARE, PASS_SCORE, TEST_SCORE_WEIGHT } from "./rules";

/** The engine and review results of one build or refactor Submit. */
export interface CodeAttemptResult
{
	/** True when the learner's code compiled. */
	compiled: boolean;

	/** Tests that passed. */
	testsPassed: number;

	/** Tests that ran. */
	testsTotal: number;

	/** AI review score (0 to 100), or null when only tests graded the attempt. */
	reviewScore: number | null;
}

/** Pass rules from the spec's "Rules" section. Pure: no I/O. */
export class PassRules
{
	/** Returns the build or refactor score: 0.6 tests + 0.4 review, with review = tests when tests-only. 0 when it did not compile. */
	codeScore(result: CodeAttemptResult): number
	{
		if (!result.compiled || result.testsTotal === 0) return 0;

		const testScore = (100 * result.testsPassed) / result.testsTotal;
		const reviewScore = result.reviewScore ?? testScore;

		return Math.round(TEST_SCORE_WEIGHT * testScore + (1 - TEST_SCORE_WEIGHT) * reviewScore);
	}

	/** Build and refactor pass: compiled, every test passed, and a score of at least 70. */
	isCodePass(result: CodeAttemptResult): boolean
	{
		const allTestsPassed = result.testsTotal > 0 && result.testsPassed === result.testsTotal;

		return result.compiled && allTestsPassed && this.codeScore(result) >= PASS_SCORE;
	}

	/** Breakdown pass: grader score of at least 70 with every required piece present after revision. */
	isBreakdownPass(score: number, everyRequiredPiecePresent: boolean): boolean
	{
		return everyRequiredPiecePresent && score >= PASS_SCORE;
	}

	/** Concept pass: at least 80% of the questions right. */
	isConceptPass(correctCount: number, questionCount: number): boolean
	{
		if (questionCount === 0) return false;

		return correctCount / questionCount >= CONCEPT_PASS_SHARE;
	}

	/** Concept score from 0 to 100. */
	conceptScore(correctCount: number, questionCount: number): number
	{
		if (questionCount === 0) return 0;

		return Math.round((100 * correctCount) / questionCount);
	}

	/** Boss integration pass: integration rubric score of at least 70. */
	isBossIntegrationPass(integrationScore: number): boolean
	{
		return integrationScore >= PASS_SCORE;
	}
}
