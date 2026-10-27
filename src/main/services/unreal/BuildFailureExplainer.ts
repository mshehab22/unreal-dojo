// Decides whether a failed build or test run is the learner's code or something outside it, and explains the outside cases in plain English.
import type { EngineInstall, ToolchainCheck } from "@shared/types/engine";
import { isAppError, type AppError } from "@shared/types/errors";

import { AppErrorException } from "../../errors/AppErrorException";
import { locatedErrors, type LocatedError } from "./buildErrorLocations";
import { BUILD_FAILURE_SIGNATURES } from "./buildFailureSignatures";
import {
	buildToolKeepsCrashing,
	earlierQuestBreaksBuild,
	engineProgramWontStart,
	questTestsDidNotRun,
	referenceSolutionBroken,
	runStoppedOutsideCode,
	runTookTooLong,
	sandboxBuildFailed,
	supportOrEngineCodeBroken,
	testReportMissing,
} from "./unrealErrors";

/** The pipeline error runners use when the learner cancelled; it is never a failure to explain. */
const CANCELLED_MESSAGE = "Cancelled.";

/** A matched line is kept this long in an error's detail. */
const MAXIMUM_DETAIL_LENGTH = 400;

/** What the sandbox build detail says when the build printed nothing to quote. */
const SILENT_BUILD_DETAIL = "The build ended with an error and printed nothing else.";

/** Where an earlier quest's files in the sandbox came from. */
export type EarlierQuestOrigin = "saved-code" | "reference-solution";

/** One earlier quest this run compiles against and where its files came from. */
export interface EarlierQuestCode
{
	questId: string;
	origin: EarlierQuestOrigin;
}

/** What the explainer is built from. */
export interface BuildFailureExplainerDependencies
{
	/** The platform toolchain check (Visual Studio or Xcode). */
	checkToolchain: () => Promise<ToolchainCheck>;

	/** Reads the engine folder again; throws an AppError exception when it moved, vanished, or is too old. */
	inspectEngine: (engineRoot: string) => Promise<EngineInstall>;
}

/** What is known about a failed quest run. */
export interface RunFailureEvidence
{
	/** The engine folder the run used. */
	engineRoot: string;

	/** The quest that was run. */
	questId: string;

	/** Whether the code compiled. */
	compiled: boolean;

	/** The filtered compiler output of the run. */
	compilerOutput: string;

	/** The pipeline problem the runner reported, if any. */
	pipelineError?: string;

	/** Earlier quests the build also compiled, with where their files came from. */
	earlierQuests: EarlierQuestCode[];
}

/** What is known about a failed sandbox build. */
export interface SandboxFailureEvidence
{
	/** The engine folder the build used. */
	engineRoot: string;

	/** The filtered compiler output of the build. */
	compilerOutput: string;

	/** The pipeline problem the build reported, if any. */
	pipelineError?: string;
}

/** Applies ordered rules, first match wins: known outside signatures, pipeline errors, the learner's own lines, an earlier quest, support or engine code, then the toolchain check. With no outside evidence a quest keeps the blame (A1199). */
export class BuildFailureExplainer
{
	private readonly dependencies: BuildFailureExplainerDependencies;

	/** Takes the toolchain check and the engine inspection, so tests can pass fakes. */
	constructor(dependencies: BuildFailureExplainerDependencies)
	{
		this.dependencies = dependencies;
	}

	/** The outside reason a quest run failed, or undefined when the learner's code (or no evidence at all) is the cause. Never throws. */
	async explainRun(evidence: RunFailureEvidence): Promise<AppError | undefined>
	{
		// A cancel, and a run that compiled and only has failing tests, are never outside failures.
		if (evidence.pipelineError === CANCELLED_MESSAGE) return undefined;
		if (evidence.compiled && evidence.pipelineError === undefined) return undefined;

		const knownFailure = this.knownOutsideFailure(evidence.compilerOutput, evidence.pipelineError);
		if (knownFailure) return knownFailure;

		if (evidence.pipelineError !== undefined) return this.explainPipelineError(evidence.pipelineError, evidence.engineRoot);

		const errors = locatedErrors(evidence.compilerOutput);
		const questId = evidence.questId.toLowerCase();

		// The learner's own lines win over everything below.
		if (errors.some((error) => error.place.kind === "quest" && error.place.questId === questId)) return undefined;

		const placedError = this.explainByPlace(errors, evidence.earlierQuests);
		if (placedError) return placedError;

		return this.blockingToolchainProblem();
	}

	/** The reason a sandbox build failed. No learner code is involved, so it always answers: a known cause, a blocking toolchain problem, or the generic setup message. Never throws. */
	async explainSandbox(evidence: SandboxFailureEvidence): Promise<AppError>
	{
		const knownFailure = this.knownOutsideFailure(evidence.compilerOutput, evidence.pipelineError);
		if (knownFailure) return knownFailure;

		if (evidence.pipelineError !== undefined) return this.explainPipelineError(evidence.pipelineError, evidence.engineRoot);

		const toolchainProblem = await this.blockingToolchainProblem();
		if (toolchainProblem) return toolchainProblem;

		return sandboxBuildFailed(firstErrorLine(evidence.compilerOutput));
	}

	/** Rule 1: the first known signature that any line of the output or the pipeline error matches. */
	private knownOutsideFailure(compilerOutput: string, pipelineError: string | undefined): AppError | undefined
	{
		const lines = [...compilerOutput.split(/\r?\n/), ...(pipelineError === undefined ? [] : pipelineError.split(/\r?\n/))];

		for (const signature of BUILD_FAILURE_SIGNATURES)
		{
			const matched = lines.find((line) => signature.pattern.test(line));

			if (matched !== undefined) return signature.explain(clipped(matched));
		}

		return undefined;
	}

	/** Rule 2: a runner's own problem report (could not start, timeout, startup crash, no report, no tests ran), or a generic outside failure for any other. */
	private async explainPipelineError(message: string, engineRoot: string): Promise<AppError>
	{
		if (/could not be started|did not (?:start|answer)/i.test(message)) return this.explainStartFailure(message, engineRoot);
		if (/took longer than/i.test(message)) return runTookTooLong(message);
		if (/stopped while starting/i.test(message)) return buildToolKeepsCrashing(message);
		if (/test report/i.test(message)) return testReportMissing(message);
		if (/none of this quest's tests ran/i.test(message)) return questTestsDidNotRun(message);

		return runStoppedOutsideCode(message);
	}

	/** A program would not start: say what is wrong with the engine folder if it moved or vanished, else that its programs would not run. */
	private async explainStartFailure(message: string, engineRoot: string): Promise<AppError>
	{
		try
		{
			await this.dependencies.inspectEngine(engineRoot);
		}
		catch (error)
		{
			if (error instanceof AppErrorException) return error.appError;
			if (isAppError(error)) return error;

			return engineProgramWontStart(`${message} (${(error as Error).message})`);
		}

		return engineProgramWontStart(message);
	}

	/** Rules 4 and 5: errors only in earlier quests' folders, or only in support code, the template or the engine. Mixed or unplaced errors answer undefined. */
	private explainByPlace(errors: LocatedError[], earlierQuests: EarlierQuestCode[]): AppError | undefined
	{
		const questErrors = errors.filter((error) => error.place.kind === "quest");
		const supportErrors = errors.filter((error) => error.place.kind === "support");

		if (questErrors.length > 0 && supportErrors.length === 0) return this.explainEarlierQuests(questErrors, earlierQuests);

		if (supportErrors.length > 0 && questErrors.length === 0) return supportOrEngineCodeBroken(clipped(supportErrors[0]?.line ?? ""));

		return undefined;
	}

	/** Rule 4: the learner's saved code in an earlier quest breaks the build, or a reference solution does (a content bug). A quest not named among the earlier ones counts as the learner's. */
	private explainEarlierQuests(questErrors: LocatedError[], earlierQuests: EarlierQuestCode[]): AppError
	{
		const brokenIds = [...new Set(questErrors.map((error) => (error.place.kind === "quest" ? error.place.questId : "")))];
		const fromReference = (questId: string): boolean => earlierQuests.some((earlier) => earlier.questId.toLowerCase() === questId && earlier.origin === "reference-solution");
		const learnerIds = brokenIds.filter((questId) => !fromReference(questId));

		if (learnerIds.length > 0) return earlierQuestBreaksBuild(learnerIds, clipped(lineIn(questErrors, learnerIds)));

		return referenceSolutionBroken(brokenIds, clipped(lineIn(questErrors, brokenIds)));
	}

	/** Rule 6: the first blocking problem of the toolchain check as the error, or undefined when the toolchain is fine or the check itself failed. */
	private async blockingToolchainProblem(): Promise<AppError | undefined>
	{
		try
		{
			const check = await this.dependencies.checkToolchain();

			return check.problems.find((problem) => problem.blocksBuild)?.error;
		}
		catch
		{
			return undefined;
		}
	}
}

/** The first error line that points into one of the quests. */
function lineIn(questErrors: LocatedError[], questIds: string[]): string
{
	const match = questErrors.find((error) => error.place.kind === "quest" && questIds.includes(error.place.questId));

	return match?.line ?? "";
}

/** The first line of the output that says error, else its first non-empty line, else a fixed sentence. */
function firstErrorLine(output: string): string
{
	const lines = output.split(/\r?\n/).map((line) => line.trim()).filter((line) => line !== "");
	const errorLine = lines.find((line) => /\berror\b/i.test(line)) ?? lines[0] ?? SILENT_BUILD_DETAIL;

	return clipped(errorLine);
}

/** A line trimmed and cut to the length an error detail keeps. */
function clipped(line: string): string
{
	const trimmed = line.trim();

	return trimmed.length > MAXIMUM_DETAIL_LENGTH ? `${trimmed.slice(0, MAXIMUM_DETAIL_LENGTH)}...` : trimmed;
}
