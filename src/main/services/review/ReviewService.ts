// The one entry point for AI review: picks a provider per call and routes each grader to it, or to tests only.
import type { AppErrorCode } from "@shared/types/errors";
import type { BreakdownGrade, CodeReview, ExplainGrade, ReviewProviderId, ReviewProviderStatus } from "@shared/types/review";

import { AppErrorException } from "../../errors/AppErrorException";
import { BreakdownGrader } from "./graders/BreakdownGrader";
import { CodeReviewer } from "./graders/CodeReviewer";
import { ExplainGrader } from "./graders/ExplainGrader";
import { FindingExplainer } from "./graders/FindingExplainer";
import { ReflectionGrader } from "./graders/ReflectionGrader";
import { parseModelOutput } from "./parsing/parseModelOutput";
import { AnthropicApiProvider } from "./providers/AnthropicApiProvider";
import { ClaudeCodeLocator } from "./providers/ClaudeCodeLocator";
import { ClaudeCodeProvider } from "./providers/ClaudeCodeProvider";
import type { IReviewProvider } from "./providers/IReviewProvider";
import { NodeProcessRunner } from "./providers/NodeProcessRunner";
import { TestsOnlyProvider, type TestsOnlyFallback } from "./providers/TestsOnlyProvider";
import { ProviderSelector } from "./ProviderSelector";
import type { BreakdownGradeInput, CodeReviewInput, ExplainGradeInput, FindingExplanationInput, ReflectionGradeInput } from "./ReviewInputs";
import { connectionCheckOutputSchema, toProviderJsonSchema } from "./ReviewSchemas";
import type { IReviewSettings } from "./settings/IReviewSettings";

/** The graders the service routes to. Tests pass their own. */
export interface ReviewGraders
{
	/** Build and refactor review. */
	codeReviewer: CodeReviewer;

	/** Breakdown grading. */
	breakdownGrader: BreakdownGrader;

	/** Explain items and reflection answers. */
	explainGrader: ExplainGrader;

	/** "Why is this a finding?" */
	findingExplainer: FindingExplainer;

	/** Reflection answers. Optional so callers that never grade one need not build it; the service makes one when absent. */
	reflectionGrader?: ReflectionGrader;
}

/** A finding explanation and who gave it, inside main only: the IPC answer stays the text (A855). */
export interface FindingExplanationAnswer
{
	/** The explanation. */
	text: string;

	/** Who answered: an AI provider, or tests-only when none could (a fallback, never kept). */
	provider: ReviewProviderId;
}

/** How a free follow-up on a stored review may be answered (A851, A852). */
export interface FollowUpOptions
{
	/** False when the attempt's tests did not all pass: then the paid API key is not asked, as A70 sets for the review itself; Claude Code and tests-only still answer. */
	allowPaidApi: boolean;
}

/** Why the API key did not answer a follow-up on an attempt with failing tests (A70, A851, A852). */
export const API_FOLLOW_UP_REASON = "The API key answers follow-ups only on submits where every test passed, so this one was answered without it. Set up Claude Code to ask about every submit that compiles.";

/** Failures that mean "this provider cannot review right now": it is set aside and the next provider is tried. */
const PROVIDER_UNAVAILABLE_CODES: ReadonlySet<AppErrorCode> = new Set<AppErrorCode>(["review-unavailable", "secure-storage-unavailable"]);

/** A reply the reviewer gave but the app could not use. For a code review it falls back instead of failing the Submit (A602). */
const BAD_REPLY_CODES: ReadonlySet<AppErrorCode> = new Set<AppErrorCode>(["review-invalid-output", "review-refused"]);

/** Why the API key did not review a submit with failing tests (A70). */
export const API_FAILING_TESTS_REASON = "The API key reviews only submits where every test passed, so this one was graded by its tests. Fix the failing tests and submit again for a full review, or set up Claude Code to review every submit that compiles.";

/** Per-grader rules for the failover loop. */
interface FailoverOptions
{
	/** A reason to answer with tests only instead of asking this provider, or null to ask it. */
	skipReason?: (provider: IReviewProvider) => string | null;

	/** True when a bad or refused reply should fall back to tests only with a retry hint instead of failing the call. */
	fallBackOnBadReply?: boolean;

	/** What a timeout tells the learner to do, in place of the error's own "Press Retry review" (follow-ups are asked again, not retried, A954). */
	timeoutAction?: string;
}

/** What a follow-up's timeout says to do: "Why?" and the reflection are asked again from the same screen (A954). */
export const FOLLOW_UP_TIMEOUT_ACTION = "Press Ask again to try once more. Your tests still count.";

/** The failover rule of a follow-up: the paid API is skipped with a reason when the attempt's tests did not all pass (A70, A851, A852). */
function followUpFailover(options: FollowUpOptions): FailoverOptions
{
	return { skipReason: (provider) => (provider.id === "anthropic-api" && !options.allowPaidApi ? API_FOLLOW_UP_REASON : null), timeoutAction: FOLLOW_UP_TIMEOUT_ACTION };
}

/** The tiny request the Settings "Test" button sends through Claude Code, to prove the login works end to end. */
const CONNECTION_CHECK_REQUEST = {
	systemPrompt: "You check that a connection works. Reply with only the JSON object the schema asks for, with ok set to true.",
	userMessage: "Connection check.",
	jsonSchema: toProviderJsonSchema(connectionCheckOutputSchema),
};

/** Routes reviews to the selected provider. The submit, breakdown, and drill flows call this; nothing else talks to a provider. */
export class ReviewService
{
	/** Keeps the selector, the Claude Code provider for its connection test, the tests-only fallback, and the graders. */
	constructor(private readonly selector: ProviderSelector, private readonly claudeCode: IReviewProvider, private readonly testsOnly: TestsOnlyProvider, private readonly graders: ReviewGraders)
	{
		this.reflectionGrader = graders.reflectionGrader ?? new ReflectionGrader();
	}

	/** The reflection grader, from the graders or made here. */
	private readonly reflectionGrader: ReflectionGrader;

	/** Every provider and whether it is available, for Settings and the Title chip. Uses cached checks; the Settings test button refreshes Claude Code (A154). */
	getProviderStatuses(): Promise<ReviewProviderStatus[]>
	{
		return this.selector.statuses();
	}

	/** Checks Claude Code again and sends it one tiny request, so "not signed in" shows in Settings instead of on the first submit. The answer also updates what the selector picks. */
	async testClaudeCode(): Promise<ReviewProviderStatus>
	{
		const status = await this.claudeCode.status(true);
		if (!status.available) return status;

		try
		{
			const reply = await this.claudeCode.complete(CONNECTION_CHECK_REQUEST);
			parseModelOutput("connection check", connectionCheckOutputSchema, reply);
			this.selector.clearMark(this.claudeCode.id);

			return status;
		}
		catch (error)
		{
			const reason = error instanceof AppErrorException ? `${error.appError.message} ${error.appError.suggestedAction}` : "The connection check failed.";

			// Only a "cannot review" failure sets Claude Code aside; a slow answer to the test must not send reviews to the paid API (A300).
			if (error instanceof AppErrorException && PROVIDER_UNAVAILABLE_CODES.has(error.appError.code)) this.selector.markUnavailable(this.claudeCode.id, reason);

			return { ...status, available: false, reason };
		}
	}

	/** Reviews a build or refactor submit. Answers undefined when the build failed: the compiler already said what is wrong. */
	async reviewCode(input: CodeReviewInput, signal?: AbortSignal): Promise<CodeReview | undefined>
	{
		if (!input.run.compiled) return undefined;

		// A70: the paid API reviews only submits where every test passed; a bad or refused reply never loses a finished engine run (A602).
		const options: FailoverOptions = { skipReason: (provider) => (provider.id === "anthropic-api" && !input.run.ok ? API_FAILING_TESTS_REASON : null), fallBackOnBadReply: true };

		return this.withProvider((provider) => this.graders.codeReviewer.review(provider, input, signal), (fallback) => this.testsOnly.reviewCode(input, fallback), options);
	}

	/** Grades a revised breakdown plan. */
	gradeBreakdown(input: BreakdownGradeInput, signal?: AbortSignal): Promise<BreakdownGrade>
	{
		return this.withProvider((provider) => this.graders.breakdownGrader.grade(provider, input, signal), (fallback) => this.testsOnly.gradeBreakdown(input, fallback));
	}

	/** Grades one sentence of an explain drill item. Always free for the learner. */
	gradeExplain(input: ExplainGradeInput, signal?: AbortSignal): Promise<ExplainGrade>
	{
		return this.withProvider((provider) => this.graders.explainGrader.grade(provider, input, signal), (fallback) => this.testsOnly.gradeExplain(input, fallback));
	}

	/** Grades the learner's answer to a review's reflection question, reading their code (A853). Free for the learner; the paid API answers only when `options` allows it (A852). */
	gradeReflection(input: ReflectionGradeInput, options: FollowUpOptions, signal?: AbortSignal): Promise<ExplainGrade>
	{
		const selfCheck = { prompt: input.question, answer: input.answer };

		return this.withProvider((provider) => this.reflectionGrader.grade(provider, input, signal), (fallback) => this.testsOnly.gradeExplain(selfCheck, fallback), followUpFailover(options));
	}

	/**
	 * Explains a finding in plain English. Free, no XP effect, cached per finding. The paid API answers only when `options` allows it (A851);
	 * `options` is required so no caller can skip A70 by default (A856). Answers who answered, so the caller keeps only an AI explanation (A855).
	 */
	explainFinding(input: FindingExplanationInput, options: FollowUpOptions, signal?: AbortSignal): Promise<FindingExplanationAnswer>
	{
		return this.withProvider(
			async (provider) => ({ text: await this.graders.findingExplainer.explain(provider, input, signal), provider: provider.id }),
			(fallback) => ({ text: this.testsOnly.explainFinding(input, fallback), provider: this.testsOnly.id }),
			followUpFailover(options),
		);
	}

	/**
	 * Runs one grader on the selected provider and decides what a failure means (A154, A300, A301, A70, A602):
	 * - review-unavailable (not installed, not signed in, key rejected) or secure-storage-unavailable (the key cannot be read):
	 *   the provider is marked and the next pick runs, in `auto` the next AI provider, otherwise tests only with the reason.
	 * - review-timeout: tests only at once, with the reason and a "Retry review" hint, never the next AI provider, so a slow
	 *   Claude Code does not turn into a paid API review on its own. The provider is not marked; the next submit tries it again.
	 * - refusal and invalid output are thrown as they are, except where `fallBackOnBadReply` is set (the code review, A602): then tests only with a retry hint.
	 * - a provider `skipReason` names (the API on a submit with failing tests, A70) is not asked; tests only answers with that reason.
	 * - cancel is always thrown.
	 * Each marking removes one provider, so the loop ends.
	 */
	private async withProvider<Result>(useProvider: (provider: IReviewProvider) => Promise<Result>, useTestsOnly: (fallback: TestsOnlyFallback) => Result, options: FailoverOptions = {}): Promise<Result>
	{
		for (;;)
		{
			const selection = await this.selector.select();
			if (selection.kind === "tests-only") return useTestsOnly({ reason: selection.reason });

			const skipReason = options.skipReason?.(selection.provider) ?? null;
			if (skipReason !== null) return useTestsOnly({ reason: skipReason });

			try
			{
				return await useProvider(selection.provider);
			}
			catch (error)
			{
				if (!(error instanceof AppErrorException)) throw error;

				const { code, message, suggestedAction } = error.appError;

				if (code === "review-timeout") return useTestsOnly({ reason: `${message} ${options.timeoutAction ?? suggestedAction}`, retryReviewSuggested: true });
				if (options.fallBackOnBadReply && BAD_REPLY_CODES.has(code)) return useTestsOnly({ reason: `${message} The tests-only review stands in; press Retry review to ask again.`, retryReviewSuggested: true });
				if (!PROVIDER_UNAVAILABLE_CODES.has(code)) throw error;

				this.selector.markUnavailable(selection.provider.id, `${message} ${suggestedAction}`);
			}
		}
	}
}

/** Builds the real service: Claude Code, then the API, then tests only, with the shipped prompts. */
export function createReviewService(settings: IReviewSettings): ReviewService
{
	const claudeCode = new ClaudeCodeProvider(new ClaudeCodeLocator(), new NodeProcessRunner());
	const anthropicApi = new AnthropicApiProvider(settings);
	const testsOnly = new TestsOnlyProvider();
	const selector = new ProviderSelector(settings, [claudeCode, anthropicApi], testsOnly);
	const graders: ReviewGraders = { codeReviewer: new CodeReviewer(), breakdownGrader: new BreakdownGrader(), explainGrader: new ExplainGrader(), findingExplainer: new FindingExplainer() };

	return new ReviewService(selector, claudeCode, testsOnly, graders);
}
