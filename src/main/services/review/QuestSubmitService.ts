// Submit for a build or refactor quest: run it in the engine, review the code, then record the attempt with its score.
import type { AuthoredQuest, PatternCard } from "@shared/types/content";
import type { AttemptOutcome, SubmitOutcome } from "@shared/types/progress";
import type { CodeReview } from "@shared/types/review";
import type { RunRequest, RunResult } from "@shared/types/run";

import { AppErrorException } from "../../errors/AppErrorException";
import { AttemptFileRules } from "../progress/AttemptFileRules";
import type { ProgressListener } from "../unreal/ProgressUpdate";
import { codeReviewInputFrom, isReviewedCodeQuest } from "./codeReviewInputFrom";
import type { CodeReviewInput } from "./ReviewInputs";

/** What one Submit hands to progress to be scored and recorded. */
export interface CodeAttemptSubmission
{
	/** The quest submitted. */
	questId: string;

	/** The engine's verdict. */
	run: RunResult;

	/** The code review, absent when the build failed. */
	review?: CodeReview;

	/** The files submitted, stored on the attempt for "why is this a finding?" (A467). */
	files: Record<string, string>;
}

/** Everything a Submit needs, as functions so each can be faked and so the runner and recorder can arrive with their own tasks. */
export interface QuestSubmitDependencies
{
	/** One quest with everything, or undefined for an unknown id. */
	getAuthoredQuest: (questId: string) => Promise<AuthoredQuest | undefined>;

	/** Every pattern card, to name a quest's patterns for the reviewer. */
	getPatternCards: () => Promise<PatternCard[]>;

	/** Builds and tests the files through the runner (M1.3b): the same path `runQuest` uses. */
	runQuest: (request: RunRequest, onProgress: ProgressListener, signal: AbortSignal) => Promise<RunResult>;

	/** Reviews the code. `ReviewService.reviewCode`, which answers undefined when the build failed. */
	reviewCode: (input: CodeReviewInput, signal: AbortSignal) => Promise<CodeReview | undefined>;

	/** Scores the attempt with the pass rules (review score null when tests-only reviewed) and records it (progress-and-rules). */
	recordCodeAttempt: (submission: CodeAttemptSubmission) => Promise<AttemptOutcome>;
}

/** Runs a Submit end to end. A cancel stops it between steps; nothing is recorded for a cancelled Submit. */
export class QuestSubmitService
{
	/** Caps the files the reviewer reads and the attempt stores. */
	private readonly fileRules = new AttemptFileRules();

	/** Keeps the dependencies. */
	constructor(private readonly dependencies: QuestSubmitDependencies)
	{
	}

	/**
	 * Runs, reviews, and records one Submit. Streams progress through `onProgress`, with a `reviewing` step before the review.
	 * `onRecording` is called once recording starts: from then on the Submit is finished and a cancel no longer applies (A601).
	 */
	async submit(request: RunRequest, onProgress: ProgressListener, signal: AbortSignal, onRecording: () => void = () => undefined): Promise<SubmitOutcome>
	{
		const quest = await this.dependencies.getAuthoredQuest(request.questId);
		if (!quest) throw new AppErrorException("quest-not-found", "That quest is not in the content.", "Go back to the World Map and open it again.", request.questId);
		if (!isReviewedCodeQuest(quest)) throw new AppErrorException("invalid-payload", "Only build and refactor quests are submitted this way.", "Use the quest's own Submit button.", `${quest.id} is a ${quest.kind} quest`);

		const run = await this.dependencies.runQuest(request, onProgress, signal);
		this.stopIfCancelled(signal);

		// The engine builds every file in full; the reviewer reads the same capped copy the attempt stores, so a finding always points at code the explainer can see (A603).
		const reviewedFiles = this.fileRules.capFiles(request.files);

		let review: CodeReview | undefined;

		if (run.compiled)
		{
			onProgress({ phase: "reviewing", lastLine: "Reviewing your code" });

			const patternCards = await this.dependencies.getPatternCards();
			review = await this.dependencies.reviewCode(codeReviewInputFrom(quest, patternCards, reviewedFiles, run), signal);
			this.stopIfCancelled(signal);
		}

		onRecording();

		const outcome = await this.dependencies.recordCodeAttempt({ questId: quest.id, run, review, files: reviewedFiles });

		return review ? { run, review, outcome } : { run, outcome };
	}

	/** Throws run-cancelled when the learner cancelled, so nothing after a cancel is recorded. */
	private stopIfCancelled(signal: AbortSignal): void
	{
		if (signal.aborted) throw new AppErrorException("run-cancelled", "The submit was cancelled.", "Submit again when you are ready.");
	}
}
