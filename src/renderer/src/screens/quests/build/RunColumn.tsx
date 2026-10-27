// The build screen's right column: Run, Submit, and Open Editor; live progress; the last submit; tests and the build log; hint spells; and the offers after failed submits.
import { MonitorPlayIcon, PlayIcon, SendIcon } from "lucide-react";
import type { ReactNode } from "react";

import type { AppError } from "@shared/types/errors";
import type { SubmitOutcome } from "@shared/types/progress";
import type { RunResult } from "@shared/types/run";

import { AppErrorView } from "@/components/AppErrorView";
import type { BuildOutcome } from "@/components/BuildProgressView";
import { Button } from "@/components/ui/button";
import type { QuestRun } from "@/data/useQuestRun";
import { modifierKeyLabel } from "@/lib/platform";

import { BuildLog } from "./BuildLog";
import { isOutsideFailureCode, NOT_YOUR_CODE_HEADLINE } from "./outsideFailureCodes";
import { RUN_STEPS, SUBMIT_STEPS } from "./questRunSteps";
import { RunProgress } from "./RunProgress";
import { TestList } from "./TestList";

/** Props for RunColumn. */
interface RunColumnProps
{
	readonly run: QuestRun<RunResult>;
	readonly submit: QuestRun<SubmitOutcome>;
	readonly lastResult: RunResult | null;

	/** Whether the result shown came from a Run or the last Submit. */
	readonly lastResultSource: "run" | "submit";
	readonly canSubmit: boolean;
	readonly submitBlockedReason: string | null;
	readonly onRun: () => void;
	readonly onSubmit: () => void;
	readonly onOpenEditor: () => void;
	readonly isOpeningEditor: boolean;

	/** The last submit card, hint spells, and offers, placed in order under the results. */
	readonly lastSubmit?: ReactNode;
	readonly hints: ReactNode;
	readonly offers?: ReactNode;
}

/** How a finished run looks in the progress view. */
function outcomeOf(status: QuestRun<unknown>["status"], result: RunResult | null): BuildOutcome
{
	if (status === "running") return "running";
	if (status === "cancelled") return "cancelled";

	return result?.ok ? "succeeded" : "failed";
}

/** What the label beside a result says: the tests, a build that never reached the learner's code, or a compile failure. */
function resultSummary(result: RunResult): string
{
	if (result.unrelatedFailure) return "could not build (not your code)";

	return result.compiled ? `tests ${result.testsPassed} of ${result.testsTotal}` : "did not compile";
}

/** True when a rejected call already shows this very failure, so the result below it does not repeat the same box. */
function isShownAsCallError(failure: AppError, callError: AppError | null): boolean
{
	return callError !== null && callError.code === failure.code && callError.message === failure.message;
}

/** The controls stack; whichever of Run or Submit ran last owns the progress view. */
export function RunColumn({ run, submit, lastResult, lastResultSource, canSubmit, submitBlockedReason, onRun, onSubmit, onOpenEditor, isOpeningEditor, lastSubmit, hints, offers }: RunColumnProps)
{
	const busy = run.status === "running" || submit.status === "running";
	const showing = submit.status === "running" ? submit : run.status !== "idle" ? run : null;
	const modifier = modifierKeyLabel();

	// A Submit rejected for an outside failure (A1208) or a failed call: shown in place, with its action and details, instead of loot.
	const failedCall = submit.status === "errored" ? submit : run.status === "errored" ? run : null;

	return (
		<div data-testid="run-column" className="flex flex-col gap-4">
			<div className="sticky top-0 z-10 -mx-4 flex flex-col gap-2 border-b border-line bg-surface px-4 pt-4 pb-3">
				<div className="grid grid-cols-2 gap-2">
					<Button variant="secondary" onClick={onRun} disabled={busy} data-testid="run-button" title={`Run (${modifier}+Enter)`}>
						<PlayIcon />
						Run
					</Button>
					<Button variant="pack" onClick={onSubmit} disabled={busy || !canSubmit} data-testid="submit-button" title={`Submit (${modifier}+Shift+Enter)`}>
						<SendIcon />
						Submit
					</Button>
				</div>
				<p className="text-2xs text-paper-faint">{submitBlockedReason ?? "Run is free and never touches your spree. Submit builds, tests, reviews, and records the attempt."}</p>
				<Button variant="ghost" size="sm" className="self-start" onClick={onOpenEditor} disabled={isOpeningEditor}>
					<MonitorPlayIcon />
					Open Editor
				</Button>
			</div>

			{showing && (
				<RunProgress
					event={showing.progress}
					outcome={showing === submit ? (submit.status === "running" ? "running" : outcomeOf(submit.status, submit.value?.run ?? null)) : outcomeOf(run.status, run.value)}
					steps={showing === submit ? SUBMIT_STEPS : RUN_STEPS}
					onCancel={showing.cancel}
					label={showing === submit ? "Submit" : "Run"}
				/>
			)}
			{failedCall?.error && (
				<AppErrorView
					error={failedCall.error}
					{...(isOutsideFailureCode(failedCall.error.code) ? { headline: NOT_YOUR_CODE_HEADLINE } : {})}
					onRetry={busy ? undefined : failedCall === submit ? onSubmit : onRun}
					retryLabel={failedCall === submit ? "Submit again" : "Run again"}
					compact
				/>
			)}

			{lastSubmit}

			{lastResult && (
				<div data-testid="run-result" data-ok={lastResult.ok} data-source={lastResultSource} className="flex flex-col gap-3 border-t border-line pt-3">
					<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">
						{lastResultSource === "submit" ? "Last submit: " : "Last run: "}
						{resultSummary(lastResult)}
					</span>
					{lastResult.unrelatedFailure && !isShownAsCallError(lastResult.unrelatedFailure, failedCall?.error ?? null) && (
						<AppErrorView
							error={lastResult.unrelatedFailure}
							headline={NOT_YOUR_CODE_HEADLINE}
							onRetry={busy ? undefined : lastResultSource === "submit" ? onSubmit : onRun}
							retryLabel={lastResultSource === "submit" ? "Submit again" : "Run again"}
							compact
						/>
					)}
					{lastResult.error && !lastResult.unrelatedFailure && <p className="text-sm text-warn">{lastResult.error}</p>}
					{lastResult.tests.length > 0 && <TestList tests={lastResult.tests} />}
					<BuildLog key={`${lastResult.durationMs}-${lastResult.compiled}`} output={lastResult.compilerOutput} startOpen={!lastResult.compiled && !lastResult.unrelatedFailure} />
				</div>
			)}

			<div className="border-t border-line pt-3">{hints}</div>
			{offers}
		</div>
	);
}
