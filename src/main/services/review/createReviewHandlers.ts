// Builds the review IPC methods and Submit from the review service, progress, content, and the runner.
import type { PackOutline } from "@shared/types/catalog";
import type { AuthoredQuest, PatternCard } from "@shared/types/content";
import type { AttemptOutcome, PlayerProgress, SubmitOutcome } from "@shared/types/progress";
import type { ExplainGrade, FindingExplanationRequest, ReflectionAnswerRequest, ReviewProviderStatus } from "@shared/types/review";
import type { RunRequest, RunResult } from "@shared/types/run";

import type { AttemptInput } from "../progress/ProgressService";
import type { RuleQuest } from "../progress/RuleQuest";
import type { ProgressListener } from "../unreal/ProgressUpdate";
import { AttemptReviewService } from "./AttemptReviewService";
import { CodeAttemptRecorder } from "./CodeAttemptRecorder";
import { QuestSubmitService } from "./QuestSubmitService";
import type { ReviewService } from "./ReviewService";

/** The review methods and Submit, in the shape `createHandlers` expects. */
export interface ReviewHandlers
{
	/** Every review provider and whether it is available now. */
	getProviderStatuses(): Promise<ReviewProviderStatus[]>;

	/** Rechecks Claude Code with one tiny real request. */
	testClaudeCode(): Promise<ReviewProviderStatus>;

	/** Explains a finding of a stored review. */
	explainFinding(request: FindingExplanationRequest): Promise<string>;

	/** Grades the answer to a stored review's reflection question. */
	answerReflection(request: ReflectionAnswerRequest): Promise<ExplainGrade>;

	/** Runs, reviews, and records a Submit. `onRecording` is called once recording starts (A471). */
	submitQuest(request: RunRequest, onProgress: ProgressListener, signal: AbortSignal, onRecording?: () => void): Promise<SubmitOutcome>;
}

/** What the review handlers are built from. */
export interface ReviewHandlerSources
{
	/** The review service with the settings-backed providers. */
	reviewService: ReviewService;

	/** The content: pack outlines, authored quests, pattern cards. */
	content: {
		listPacks(): Promise<PackOutline[]>;
		getAuthoredQuest(questId: string): Promise<AuthoredQuest | undefined>;
		getPatternCards(): Promise<PatternCard[]>;
	};

	/** The learner's save and `recordAttempt` (ProgressService). */
	progress: {
		getProgress(): PlayerProgress;
		recordAttempt(input: AttemptInput, allQuests: RuleQuest[]): Promise<AttemptOutcome>;
	};

	/** The runner path `runQuest` uses (M1.3b). */
	runQuest: (request: RunRequest, onProgress: ProgressListener, signal: AbortSignal) => Promise<RunResult>;
}

/** The text a "why is this a finding?" explanation can refer to: a code quest's brief, or a breakdown or boss spec. */
function briefOf(quest: AuthoredQuest | undefined): string
{
	if (!quest) return "";
	if ("brief" in quest) return quest.brief;
	if ("spec" in quest) return quest.spec;

	return "";
}

/** Wires the follow-ups and Submit together. */
export function createReviewHandlers(sources: ReviewHandlerSources): ReviewHandlers
{
	const { reviewService, content, progress } = sources;

	const followUps = new AttemptReviewService(
		{
			attempts: () => progress.getProgress().attempts,

			// Only the files stored on the attempt itself, never the draft, which can change after Submit (A467).
			submittedFiles: (attempt) => attempt.files ?? {},
			questBrief: async (questId) => briefOf(await content.getAuthoredQuest(questId)),
		},
		reviewService,
	);

	const recorder = new CodeAttemptRecorder({ listPacks: () => content.listPacks(), recordAttempt: (input, allQuests) => progress.recordAttempt(input, allQuests) });

	const submitter = new QuestSubmitService({
		getAuthoredQuest: (questId) => content.getAuthoredQuest(questId),
		getPatternCards: () => content.getPatternCards(),
		runQuest: sources.runQuest,
		reviewCode: (input, signal) => reviewService.reviewCode(input, signal),
		recordCodeAttempt: (submission) => recorder.record(submission),
	});

	return {
		getProviderStatuses: () => reviewService.getProviderStatuses(),
		testClaudeCode: () => reviewService.testClaudeCode(),
		explainFinding: (request) => followUps.explainFinding(request),
		answerReflection: (request) => followUps.answerReflection(request),
		submitQuest: (request, onProgress, signal, onRecording) => submitter.submit(request, onProgress, signal, onRecording),
	};
}
