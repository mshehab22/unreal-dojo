// Retry review: reviews an earlier Submit's stored files and run result again, with no new build, and replaces that attempt's stored review.
import type { AuthoredQuest, PatternCard } from "@shared/types/content";
import type { AttemptRecord } from "@shared/types/progress";
import type { CodeReview } from "@shared/types/review";

import { AppErrorException } from "../../errors/AppErrorException";
import { codeReviewInputFrom, isReviewedCodeQuest } from "./codeReviewInputFrom";
import type { CodeReviewInput } from "./ReviewInputs";

/** What a retry needs, as functions so tests pass plain data. */
export interface ReviewRetrySources
{
	/** Every graded attempt in the save (`ProgressService.getProgress().attempts`). */
	attempts: () => readonly AttemptRecord[];

	/** One quest with everything, or undefined for an unknown id. */
	getAuthoredQuest: (questId: string) => Promise<AuthoredQuest | undefined>;

	/** Every pattern card, to name a quest's patterns for the reviewer. */
	getPatternCards: () => Promise<PatternCard[]>;

	/** `ReviewService.reviewCode`: picks the provider and keeps A70 (the API reviews only all-passed runs), the fallbacks, and the timeout rules. */
	reviewCode: (input: CodeReviewInput) => Promise<CodeReview | undefined>;

	/** `ProgressService.replaceAttemptReview`: stores the new review on the attempt, nothing else. */
	replaceAttemptReview: (attemptId: string, review: CodeReview) => Promise<AttemptRecord>;
}

/** Asks the reviewer again about a stored Submit. The attempt's score, pass, and XP were settled at Submit and do not change (A741). */
export class ReviewRetryService
{
	/** Keeps the sources. */
	constructor(private readonly sources: ReviewRetrySources)
	{
	}

	/** Reviews the attempt's stored files and run again and answers the new review, which also replaces the stored one. */
	async retry(attemptId: string): Promise<CodeReview>
	{
		const attempt = this.sources.attempts().find((candidate) => candidate.attemptId === attemptId);
		if (!attempt) throw new AppErrorException("attempt-not-found", "That attempt is not in your save.", "Open the quest again and submit it to get a fresh review.", attemptId);

		// Only a quest's last five Submits keep their files and run (A604, A740), and attempts from before A740 have no run.
		if (!attempt.files || !attempt.run) throw new AppErrorException("attempt-not-found", "This attempt's code is no longer stored, so it cannot be reviewed again.", "Submit the quest again to get a fresh review.", attemptId);
		if (!attempt.run.compiled) throw new AppErrorException("attempt-not-found", "This attempt did not compile, so it has no code review to retry.", "Fix the build errors and submit again.", attemptId);

		const quest = await this.sources.getAuthoredQuest(attempt.questId);
		if (!quest) throw new AppErrorException("quest-not-found", "That quest is not in the content.", "Go back to the World Map and open it again.", attempt.questId);
		if (!isReviewedCodeQuest(quest)) throw new AppErrorException("attempt-not-found", "Only build and refactor attempts have a code review to retry.", "Open the review again from the quest.", `${quest.id} is a ${quest.kind} quest`);

		const input = codeReviewInputFrom(quest, await this.sources.getPatternCards(), attempt.files, attempt.run);
		const review = await this.sources.reviewCode(input);
		if (!review) throw new AppErrorException("attempt-not-found", "This attempt did not compile, so it has no code review to retry.", "Fix the build errors and submit again.", attemptId);

		await this.sources.replaceAttemptReview(attemptId, review);

		return review;
	}
}
