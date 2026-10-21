// The one entry point for AI review: picks a provider per call and routes each grader to it, or to tests only.
import type { BreakdownGrade, CodeReview, ExplainGrade, ReviewProviderStatus } from "@shared/types/review";

import { AppErrorException } from "../../errors/AppErrorException";
import { BreakdownGrader } from "./graders/BreakdownGrader";
import { CodeReviewer } from "./graders/CodeReviewer";
import { ExplainGrader } from "./graders/ExplainGrader";
import { FindingExplainer } from "./graders/FindingExplainer";
import { parseModelOutput } from "./parsing/parseModelOutput";
import { AnthropicApiProvider } from "./providers/AnthropicApiProvider";
import { ClaudeCodeLocator } from "./providers/ClaudeCodeLocator";
import { ClaudeCodeProvider } from "./providers/ClaudeCodeProvider";
import type { IReviewProvider } from "./providers/IReviewProvider";
import { NodeProcessRunner } from "./providers/NodeProcessRunner";
import { TestsOnlyProvider } from "./providers/TestsOnlyProvider";
import { ProviderSelector } from "./ProviderSelector";
import type { BreakdownGradeInput, CodeReviewInput, ExplainGradeInput, FindingExplanationInput } from "./ReviewInputs";
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
	}

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
			this.selector.markUnavailable(this.claudeCode.id, reason);

			return { ...status, available: false, reason };
		}
	}

	/** Reviews a build or refactor submit. Answers undefined when the build failed: the compiler already said what is wrong. */
	async reviewCode(input: CodeReviewInput, signal?: AbortSignal): Promise<CodeReview | undefined>
	{
		if (!input.run.compiled) return undefined;

		return this.withProvider((provider) => this.graders.codeReviewer.review(provider, input, signal), (reason) => this.testsOnly.reviewCode(input, reason));
	}

	/** Grades a revised breakdown plan. */
	gradeBreakdown(input: BreakdownGradeInput, signal?: AbortSignal): Promise<BreakdownGrade>
	{
		return this.withProvider((provider) => this.graders.breakdownGrader.grade(provider, input, signal), (reason) => this.testsOnly.gradeBreakdown(input, reason));
	}

	/** Grades one sentence: an explain item or a reflection answer. Always free for the learner. */
	gradeExplain(input: ExplainGradeInput, signal?: AbortSignal): Promise<ExplainGrade>
	{
		return this.withProvider((provider) => this.graders.explainGrader.grade(provider, input, signal), (reason) => this.testsOnly.gradeExplain(input, reason));
	}

	/** Explains a finding in plain English. Free, no XP effect, cached per finding. */
	explainFinding(input: FindingExplanationInput, signal?: AbortSignal): Promise<string>
	{
		return this.withProvider((provider) => this.graders.findingExplainer.explain(provider, input, signal), () => this.testsOnly.explainFinding(input));
	}

	/**
	 * Runs one grader on the selected provider. When the provider cannot review (review-unavailable, for example Claude Code is not signed in),
	 * it is marked unavailable and the next pick runs: in `auto` the next AI provider, otherwise tests only with the reason. Cancel, refusal,
	 * and invalid output are not provider problems and are thrown as they are. Each failure removes one provider, so the loop ends.
	 */
	private async withProvider<Result>(useProvider: (provider: IReviewProvider) => Promise<Result>, useTestsOnly: (reason?: string) => Result): Promise<Result>
	{
		for (;;)
		{
			const selection = await this.selector.select();
			if (selection.kind === "tests-only") return useTestsOnly(selection.reason);

			try
			{
				return await useProvider(selection.provider);
			}
			catch (error)
			{
				if (!(error instanceof AppErrorException) || error.appError.code !== "review-unavailable") throw error;

				this.selector.markUnavailable(selection.provider.id, `${error.appError.message} ${error.appError.suggestedAction}`);
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
