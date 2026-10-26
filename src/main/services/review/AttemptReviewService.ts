// The two follow-ups on a stored code review: "why is this a finding?" and grading the learner's answer to the reflection question.
import { createHash } from "node:crypto";

import type { AttemptRecord } from "@shared/types/progress";
import type { CodeReview, ExplainGrade, FindingExplanationRequest, ReflectionAnswerRequest, ReflectionRecord } from "@shared/types/review";

import { AppErrorException } from "../../errors/AppErrorException";
import type { FindingExplanationInput, ReflectionGradeInput } from "./ReviewInputs";
import type { FindingExplanationAnswer, FollowUpOptions } from "./ReviewService";

/** What the follow-ups need from the rest of the app, as functions so tests pass plain data. */
export interface AttemptReviewSources
{
	/** Every graded attempt in the save (`ProgressService.getProgress().attempts`). */
	attempts: () => readonly AttemptRecord[];

	/** The files stored on the attempt (A467); empty when they were pruned or never stored. Never the quest's draft. */
	submittedFiles: (attempt: AttemptRecord) => Record<string, string>;

	/** A quest's brief (markdown), or an empty string when the quest is no longer in the content. */
	questBrief: (questId: string) => Promise<string>;

	/** `ProgressService.saveFindingExplanation`: keeps an explanation on the attempt (A851). */
	saveExplanation: (attemptId: string, findingKey: string, explanation: string) => Promise<void>;

	/** `ProgressService.saveReflection`: keeps the reflection answer and its grade on the attempt (A852). */
	saveReflection: (attemptId: string, reflection: ReflectionRecord) => Promise<void>;

	/** The time now, for the reflection record. */
	now: () => Date;
}

/** The review service calls the follow-ups use. `ReviewService` meets it. */
export interface FollowUpGraders
{
	/** Explains one finding, cached per finding; the paid API only when `options` allows it. Answers who answered. */
	explainFinding(input: FindingExplanationInput, options: FollowUpOptions): Promise<FindingExplanationAnswer>;

	/** Grades one reflection answer; the paid API only when `options` allows it. */
	gradeReflection(input: ReflectionGradeInput, options: FollowUpOptions): Promise<ExplainGrade>;
}

/** Finds an attempt's review and answers the free follow-ups on it. They never change XP or score; their answers are kept on the attempt. */
export class AttemptReviewService
{
	/** Keeps the sources and the graders. */
	constructor(private readonly sources: AttemptReviewSources, private readonly graders: FollowUpGraders)
	{
	}

	/**
	 * Explains in plain English why a finding is a finding. An explanation kept on the attempt is answered again for free (A851).
	 * Only an AI provider's answer is kept: a tests-only fallback (no reviewer set up, a timeout, the A70 skip) is answered but not kept, so the next ask can reach the AI (A855).
	 */
	async explainFinding(request: FindingExplanationRequest): Promise<string>
	{
		const { attempt, review } = this.reviewedAttempt(request.attemptId);
		const finding = review.findings[request.findingIndex];

		if (!finding) throw new AppErrorException("attempt-not-found", "That finding is not in this review.", "Open the review again and pick a finding from the list.", `finding ${request.findingIndex} of ${review.findings.length}`);

		// Attempt ids restart at attempt-1 after a progress reset, so the attempt's time is part of the cache key (A600); Retry review replaces the findings, so their text is too (A742).
		const findingHash = createHash("sha256").update(JSON.stringify(finding)).digest("hex").slice(0, 16);
		const findingKey = `${request.findingIndex}:${findingHash}`;

		const kept = attempt.explanations?.[findingKey];
		if (kept !== undefined) return kept;

		const answer = await this.graders.explainFinding(
			{ cacheKey: `${request.attemptId}:${attempt.at}:${findingKey}`, brief: await this.sources.questBrief(attempt.questId), finding, files: this.sources.submittedFiles(attempt) },
			this.followUpOptions(attempt),
		);

		if (answer.provider !== "tests-only") await this.sources.saveExplanation(request.attemptId, findingKey, answer.text);

		return answer.text;
	}

	/**
	 * Grades the learner's one-sentence answer to the review's reflection question, reading their submitted code (A852, A853).
	 * An AI grade is kept on the attempt; sending the same sentence again answers the kept grade for free, and a new sentence is graded and replaces it.
	 * A tests-only self-check (no reviewer set up, a timeout, the A70 skip) is answered but neither kept nor reused, so the suggested retry can reach the AI (A855).
	 */
	async answerReflection(request: ReflectionAnswerRequest): Promise<ExplainGrade>
	{
		const { attempt, review } = this.reviewedAttempt(request.attemptId);
		const answer = request.answer.trim();

		if (answer.length === 0) throw new AppErrorException("invalid-payload", "Write one sentence to answer the question.", "Type your answer, then send it.");
		if (attempt.reflection?.answer === answer && attempt.reflection.grade.provider !== "tests-only") return attempt.reflection.grade;

		const grade = await this.graders.gradeReflection({ question: review.reflectionQuestion, reviewSummary: review.summary, files: this.sources.submittedFiles(attempt), answer }, this.followUpOptions(attempt));

		if (grade.provider !== "tests-only") await this.sources.saveReflection(request.attemptId, { answer, grade, at: this.sources.now().toISOString() });

		return grade;
	}

	/** A70 for follow-ups: the paid API answers only on an attempt whose tests all passed; an attempt with no stored run counts as not passed (A851, A852). */
	private followUpOptions(attempt: AttemptRecord): FollowUpOptions
	{
		return { allowPaidApi: attempt.run?.ok === true };
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
