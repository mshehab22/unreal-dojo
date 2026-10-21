// The two follow-ups on a stored code review: "why is this a finding?" and grading the learner's answer to the reflection question.
import type { AttemptRecord } from "@shared/types/progress";
import type { CodeReview, ExplainGrade, FindingExplanationRequest, ReflectionAnswerRequest } from "@shared/types/review";

import { AppErrorException } from "../../errors/AppErrorException";
import type { ExplainGradeInput, FindingExplanationInput } from "./ReviewInputs";

/** What the follow-ups need from the rest of the app, as functions so tests pass plain data. */
export interface AttemptReviewSources
{
	/** Every graded attempt in the save (`ProgressService.getProgress().attempts`). */
	attempts: () => readonly AttemptRecord[];

	/** The files stored on the attempt (A467); empty when they were pruned or never stored. Never the quest's draft. */
	submittedFiles: (attempt: AttemptRecord) => Record<string, string>;

	/** A quest's brief (markdown), or an empty string when the quest is no longer in the content. */
	questBrief: (questId: string) => Promise<string>;
}

/** The review service calls the follow-ups use. `ReviewService` meets it. */
export interface FollowUpGraders
{
	/** Explains one finding, cached per finding. */
	explainFinding(input: FindingExplanationInput): Promise<string>;

	/** Grades one sentence. */
	gradeExplain(input: ExplainGradeInput): Promise<ExplainGrade>;
}

/** Finds an attempt's review and answers the free follow-ups on it. Nothing here changes XP or progress. */
export class AttemptReviewService
{
	/** Keeps the sources and the graders. */
	constructor(private readonly sources: AttemptReviewSources, private readonly graders: FollowUpGraders)
	{
	}

	/** Explains in plain English why a finding is a finding. Cached by attempt and finding index. */
	async explainFinding(request: FindingExplanationRequest): Promise<string>
	{
		const { attempt, review } = this.reviewedAttempt(request.attemptId);
		const finding = review.findings[request.findingIndex];

		if (!finding) throw new AppErrorException("attempt-not-found", "That finding is not in this review.", "Open the review again and pick a finding from the list.", `finding ${request.findingIndex} of ${review.findings.length}`);

		return this.graders.explainFinding({
			cacheKey: `${request.attemptId}:${request.findingIndex}`,
			brief: await this.sources.questBrief(attempt.questId),
			finding,
			files: this.sources.submittedFiles(attempt),
		});
	}

	/** Grades the learner's one-sentence answer to the review's reflection question, with the review's summary as context. */
	async answerReflection(request: ReflectionAnswerRequest): Promise<ExplainGrade>
	{
		const { review } = this.reviewedAttempt(request.attemptId);

		return this.graders.gradeExplain({ prompt: review.reflectionQuestion, context: `Code review summary: ${review.summary}`, answer: request.answer });
	}

	/** The attempt with this id and its code review. Throws attempt-not-found when either is missing. */
	private reviewedAttempt(attemptId: string): { attempt: AttemptRecord; review: CodeReview }
	{
		const attempt = this.sources.attempts().find((candidate) => candidate.attemptId === attemptId);
		if (!attempt) throw new AppErrorException("attempt-not-found", "That attempt is not in your save.", "Open the quest again and submit it to get a fresh review.", attemptId);
		if (!attempt.review) throw new AppErrorException("attempt-not-found", "That attempt has no code review.", "Only build and refactor submits have a review to ask about.", attemptId);

		return { attempt, review: attempt.review };
	}
}
