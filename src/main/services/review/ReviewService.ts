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

	/** Every provider and whether it is available, for Settings and the Title chip. */
	getProviderStatuses(): Promise<ReviewProviderStatus[]>
	{
		return this.selector.statuses(true);
	}

	/** Checks Claude Code again and sends it one tiny request, so "not signed in" shows in Settings instead of on the first submit. */
	async testClaudeCode(): Promise<ReviewProviderStatus>
	{
		const status = await this.claudeCode.status(true);
		if (!status.available) return status;

		try
		{
			const reply = await this.claudeCode.complete(CONNECTION_CHECK_REQUEST);
			parseModelOutput("connection check", connectionCheckOutputSchema, reply);

			return status;
		}
		catch (error)
		{
			const reason = error instanceof AppErrorException ? `${error.appError.message} ${error.appError.suggestedAction}` : "The connection check failed.";

			return { ...status, available: false, reason };
		}
	}

	/** Reviews a build or refactor submit. Answers undefined when the build failed: the compiler already said what is wrong. */
	async reviewCode(input: CodeReviewInput, signal?: AbortSignal): Promise<CodeReview | undefined>
	{
		if (!input.run.compiled) return undefined;

		const selection = await this.selector.select();
		if (selection.kind === "tests-only") return selection.provider.reviewCode(input);

		return this.graders.codeReviewer.review(selection.provider, input, signal);
	}

	/** Grades a revised breakdown plan. */
	async gradeBreakdown(input: BreakdownGradeInput, signal?: AbortSignal): Promise<BreakdownGrade>
	{
		const selection = await this.selector.select();
		if (selection.kind === "tests-only") return selection.provider.gradeBreakdown(input);

		return this.graders.breakdownGrader.grade(selection.provider, input, signal);
	}

	/** Grades one sentence: an explain item or a reflection answer. Always free for the learner. */
	async gradeExplain(input: ExplainGradeInput, signal?: AbortSignal): Promise<ExplainGrade>
	{
		const selection = await this.selector.select();
		if (selection.kind === "tests-only") return selection.provider.gradeExplain(input);

		return this.graders.explainGrader.grade(selection.provider, input, signal);
	}

	/** Explains a finding in plain English. Free, no XP effect, cached per finding. */
	async explainFinding(input: FindingExplanationInput, signal?: AbortSignal): Promise<string>
	{
		const selection = await this.selector.select();
		if (selection.kind === "tests-only") return this.testsOnly.explainFinding(input);

		return this.graders.findingExplainer.explain(selection.provider, input, signal);
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
