// Types for the three AI graders and their providers. Field shapes follow the JSON schemas in docs/systems/ai-review.md.

/** The three review transports (D11). */
export type ReviewProviderId = "claude-code" | "anthropic-api" | "tests-only";

/** Whether one provider can be used right now, for the Settings screen and the Title chip. */
export interface ReviewProviderStatus
{
	/** Which provider. */
	id: ReviewProviderId;

	/** True when it can take a review now. */
	available: boolean;

	/** Plain-English reason when it is not available, for example "Claude Code was not found on PATH." */
	reason?: string;

	/** CLI version (Claude Code) or model id (API), when known. */
	version?: string;
}

/** How serious one review finding is. */
export type FindingSeverity = "problem" | "suggestion" | "praise";

/** One rubric line and whether the code met it. */
export interface RubricLineResult
{
	/** The rubric line as written in the quest. */
	line: string;

	/** True when the code meets it. */
	met: boolean;

	/** Short reason. */
	note: string;
}

/** One thing the reviewer noticed. */
export interface ReviewFinding
{
	/** How serious it is. */
	severity: FindingSeverity;

	/** One-line title. */
	title: string;

	/** Plain-English detail. Never the solution, at most one corrected line. */
	detail: string;

	/** File the finding is about, when it points at code. */
	file?: string;

	/** Line in that file. */
	line?: number;
}

/** The code reviewer's answer for a build or refactor submit. */
export interface CodeReview
{
	/** Overall score from 0 to 100. */
	score: number;

	/** Two or three sentence summary. */
	summary: string;

	/** Each rubric line met or not. */
	rubric: RubricLineResult[];

	/** Findings, in the order the reviewer gave them. */
	findings: ReviewFinding[];

	/** One question for the learner to answer in a sentence on the loot screen. */
	reflectionQuestion: string;

	/** A pointer toward the idiomatic alternative, shown after a pass. */
	alternativeHint: string;

	/** Which provider produced this review. */
	provider: ReviewProviderId;
}

/** Whether one required breakdown piece showed up in the learner's plan. */
export interface RequiredPieceCoverage
{
	/** The required piece's label from the quest. */
	label: string;

	/** True when the plan covers it. */
	covered: boolean;

	/** Label of the learner's piece it was matched to, by meaning. */
	matchedTo?: string;
}

/** The breakdown grader's answer. */
export interface BreakdownGrade
{
	/** Overall score from 0 to 100. */
	score: number;

	/** Two or three sentence summary. */
	summary: string;

	/** Coverage of every required piece. */
	requiredPiecesCovered: RequiredPieceCoverage[];

	/** What is wrong or risky in the plan. */
	concerns: string[];

	/** What the plan does well. */
	strengths: string[];

	/** How much the revision improved the plan, from 0 to 100. Most of the score comes from this. */
	revisionQuality: number;

	/** Index into the quest's reference plans of the one to show next. */
	alternativeToShow: number;

	/** Which provider produced this grade. */
	provider: ReviewProviderId;
}

/** The explain grader's verdict on one learner sentence. */
export type ExplainVerdict = "correct" | "partly" | "incorrect";

/** The explain grader's answer for an explain-in-one-sentence item or a reflection answer. Always free. */
export interface ExplainGrade
{
	/** Score from 0 to 100. */
	score: number;

	/** Short verdict. */
	verdict: ExplainVerdict;

	/** One or two sentence note on what was right or missing. */
	note: string;

	/** Which provider produced this grade. Tests only means "self-check against the model answer". */
	provider: ReviewProviderId;
}

/** What the renderer sends to ask "why is this a finding?". Free, cached per finding. */
export interface FindingExplanationRequest
{
	/** The attempt whose review holds the finding. */
	attemptId: string;

	/** Index of the finding in that review's `findings`. */
	findingIndex: number;
}

/** What the renderer sends with the learner's one-sentence answer to a review's reflection question. */
export interface ReflectionAnswerRequest
{
	/** The attempt whose review asked the question. */
	attemptId: string;

	/** The learner's sentence. */
	answer: string;
}
