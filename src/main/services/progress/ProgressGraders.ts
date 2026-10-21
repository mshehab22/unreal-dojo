// The two AI graders the progress flows need. ReviewService meets this interface; until it is wired, tests-only grading stands in.
import type { BreakdownGrade, ExplainGrade } from "@shared/types/review";

import type { BreakdownGradeInput, ExplainGradeInput } from "../review/ReviewInputs";
import { TestsOnlyProvider } from "../review/providers/TestsOnlyProvider";

/** Grades explain items and revised breakdown plans. */
export interface ProgressGraders
{
	/** Grades one sentence. */
	gradeExplain(input: ExplainGradeInput): Promise<ExplainGrade>;

	/** Grades a revised breakdown plan. */
	gradeBreakdown(input: BreakdownGradeInput): Promise<BreakdownGrade>;
}

/** Why tests-only grading answers while the AI reviewer is not wired into the app yet. */
const NOT_WIRED_REASON = "The AI reviewer is not connected to drills and breakdowns yet.";

/** Graders that always use the tests-only fallback (self-check for explain items, label matching for breakdowns), for before ReviewService is wired (A318). */
export function createTestsOnlyGraders(): ProgressGraders
{
	const testsOnly = new TestsOnlyProvider();

	return {
		gradeExplain: async (input) => testsOnly.gradeExplain(input, { reason: NOT_WIRED_REASON }),
		gradeBreakdown: async (input) => testsOnly.gradeBreakdown(input, { reason: NOT_WIRED_REASON }),
	};
}
