// Decides whether a failed build or test run is the learner's code or something outside it, and explains the outside cases in plain English.
import type { EngineInstall, ToolchainCheck } from "@shared/types/engine";
import { isAppError, type AppError } from "@shared/types/errors";

import { AppErrorException } from "../../errors/AppErrorException";
import { isMissingFileError, locatedErrors, questIdsNamedIn, type LocatedError } from "./buildErrorLocations";
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
	sandboxHoldsBrokenQuests,
	supportOrEngineCodeBroken,
} from "./unrealErrors";

/** The pipeline error runners use when the learner cancelled; it is never a failure to explain. */
const CANCELLED_MESSAGE = "Cancelled.";

/** A matched line is kept this long in an error's detail. */
const MAXIMUM_DETAIL_LENGTH = 400;

/** What the sandbox build detail says when the build printed nothing to quote. */
const SILENT_BUILD_DETAIL = "The build ended with an error and printed nothing else.";

/** A clang source excerpt or caret line (`   12 |   code` or `      |   ^~~~`): the learner's own text echoed back. */
const CODE_EXCERPT_LINE = /^\s*\d*\s*\|/;

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

/** Applies ordered rules, first match wins: known outside signatures, certain pipeline errors, any line naming the learner's quest, an earlier quest, support or engine code, then the toolchain check (only when no compiler or linker error exists). With no outside evidence a quest keeps the blame (A1199). */
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

		const namesTheQuest = questIdsNamedIn(evidence.compilerOutput).includes(evidence.questId.toLowerCase());
		const knownFailure = this.knownOutsideFailure(evidence.compilerOutput, evidence.pipelineError, namesTheQuest, evidence.compiled);
		if (knownFailure) return knownFailure;

		// A pipeline error not on the outside list (a crash or endless loop in a test, an unknown text) stays with the quest; RunResult.error still shows it.
		if (evidence.pipelineError !== undefined) return this.outsidePipelineFailure(evidence.pipelineError, evidence.engineRoot, evidence.compiled);

		// The learner's own folder or test file named on ANY line (an error, a note, an include chain, a "requested here") keeps the blame with the quest.
		if (namesTheQuest) return undefined;

		const errors = locatedErrors(evidence.compilerOutput);
		const placedError = this.explainByPlace(errors, evidence.earlierQuests);
		if (placedError) return placedError;

		// A compiler or linker diagnostic proves the toolchain ran, so only a build with no such line can be a toolchain problem.
		if (errors.length > 0) return undefined;

		return this.blockingToolchainProblem();
	}

	/** The reason a sandbox build failed. No quest code is being run, so it always answers: a known cause, a pipeline problem, quest code left in the sandbox, support code, a blocking toolchain problem, or the generic setup message. Never throws. */
	async explainSandbox(evidence: SandboxFailureEvidence): Promise<AppError>
	{
		const knownFailure = this.knownOutsideFailure(evidence.compilerOutput, evidence.pipelineError, false, false);
		if (knownFailure) return knownFailure;

		if (evidence.pipelineError !== undefined) return (await this.outsidePipelineFailure(evidence.pipelineError, evidence.engineRoot, false)) ?? runStoppedOutsideCode(evidence.pipelineError);

		// A rebuild keeps the quests already in the sandbox, so any line naming one (an error, a note, an include chain) means its code may be the cause.
		const namedQuestIds = questIdsNamedIn(evidence.compilerOutput);
		if (namedQuestIds.length > 0) return sandboxHoldsBrokenQuests(namedQuestIds, clipped(firstLineNamingAQuest(evidence.compilerOutput)));

		const errors = locatedErrors(evidence.compilerOutput);
		const outsideErrors = errors.filter(isOutsideError);

		if (outsideErrors.length > 0 && !errors.some(blocksOutsideRules)) return supportOrEngineCodeBroken(clipped(outsideErrors[0]?.line ?? ""));

		if (errors.length === 0)
		{
			const toolchainProblem = await this.blockingToolchainProblem();
			if (toolchainProblem) return toolchainProblem;
		}

		return sandboxBuildFailed(firstErrorLine(evidence.compilerOutput));
	}

	/** Rule 1: the first known signature that a line of the output or the pipeline error matches. A line that names a quest folder or test file, and a clang code excerpt line, is the learner's text and never counts. A signature for a failure that stops the build before compiling is ignored when the output names the quest, since that proves the compiler ran. */
	private knownOutsideFailure(compilerOutput: string, pipelineError: string | undefined, outputNamesTheQuest: boolean, compiled: boolean): AppError | undefined
	{
		// Once the code compiled, the output holds only kept warnings: a coincident warning must not refund a test-time crash or loop, so only the pipeline error is read.
		const outputLines = compiled ? [] : compilerOutput.split(/\r?\n/).filter((line) => questIdsNamedIn(line).length === 0 && !CODE_EXCERPT_LINE.test(line));
		const lines = [...outputLines, ...(pipelineError === undefined ? [] : pipelineError.split(/\r?\n/))];

		for (const signature of BUILD_FAILURE_SIGNATURES)
		{
			if (signature.beforeCompiling && outputNamesTheQuest) continue;

			const matched = lines.find((line) => signature.pattern.test(line));

			if (matched !== undefined) return signature.explain(clipped(matched));
		}

		return undefined;
	}

	/** Rule 2: the runner problems that are outside the learner's code for certain: a program that could not start, a build that timed out or whose tool crashed while starting (only before the code compiled), and none of the quest's tests running. Once the code compiled, a timeout or a missing test report may be the learner's crash or endless loop, and any text not listed here is unknown: both answer undefined (A1199). */
	private async outsidePipelineFailure(message: string, engineRoot: string, compiled: boolean): Promise<AppError | undefined>
	{
		if (/could not be started|did not (?:start|answer)/i.test(message)) return this.explainStartFailure(message, engineRoot);
		if (/none of this quest's tests ran/i.test(message)) return questTestsDidNotRun(message);

		if (compiled) return undefined;

		if (/took longer than/i.test(message)) return runTookTooLong(message);
		if (/stopped while starting/i.test(message)) return buildToolKeepsCrashing(message);

		return undefined;
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

	/** Rules 4 and 5: errors only in earlier quests' folders, or only in support code, the template, or the engine's missing files. Mixed or unplaced errors, an error in a quest that is not an earlier one, and an engine error that is not a missing file all answer undefined: the code that included the header may be the learner's, and MSVC prints no include chain. */
	private explainByPlace(errors: LocatedError[], earlierQuests: EarlierQuestCode[]): AppError | undefined
	{
		const questErrors = errors.filter((error) => error.place.kind === "quest");
		const outsideErrors = errors.filter(isOutsideError);

		// "Only" means only: an error line with an unknown location, or an engine error that is not a missing file, blocks both rules.
		if (errors.some(blocksOutsideRules)) return undefined;

		if (questErrors.length > 0 && outsideErrors.length === 0) return this.explainEarlierQuests(questErrors, earlierQuests);

		if (outsideErrors.length > 0 && questErrors.length === 0) return supportOrEngineCodeBroken(clipped(outsideErrors[0]?.line ?? ""));

		return undefined;
	}

	/** Rule 4: the learner's saved code in an earlier quest breaks the build, or a reference solution does (a content bug). A quest that is not one of the earlier quests (a later or dependent one) keeps the blame with this quest, so it answers undefined. */
	private explainEarlierQuests(questErrors: LocatedError[], earlierQuests: EarlierQuestCode[]): AppError | undefined
	{
		const brokenIds = brokenQuestIds(questErrors);

		// True when the quest is one this run compiles against.
		const isEarlier = (questId: string): boolean => earlierQuests.some((earlier) => earlier.questId.toLowerCase() === questId);

		if (!brokenIds.every(isEarlier)) return undefined;

		// True when the quest's files in the sandbox came from a reference solution, not from the learner.
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

/** True for an error that is certainly not the learner's: in a support source file or the template, or an engine error that says a file is missing. */
function isOutsideError(error: LocatedError): boolean
{
	return error.place.kind === "support" || (error.place.kind === "engine" && isMissingFileError(error.line));
}

/** True for an error that stops the "only in earlier quests" and "only in support or the engine" rules: an unknown location, or an engine error that is not a missing file (MSVC prints no include chain, so the learner's header may have caused it). */
function blocksOutsideRules(error: LocatedError): boolean
{
	return error.place.kind === "unknown" || (error.place.kind === "engine" && !isMissingFileError(error.line));
}

/** The first line of the output that names a quest folder or test file, or an empty string. */
function firstLineNamingAQuest(output: string): string
{
	return output.split(/\r?\n/).find((line) => questIdsNamedIn(line).length > 0) ?? "";
}

/** The quest ids the error lines point into, once each. */
function brokenQuestIds(questErrors: LocatedError[]): string[]
{
	return [...new Set(questErrors.map((error) => (error.place.kind === "quest" ? error.place.questId : "")))];
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
