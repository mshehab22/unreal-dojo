// Setup step 3: copy the template and run the first full build, with phase, elapsed time, cancel, plain-English failures (the main process's own explanation first), and retry.
import { CircleCheckIcon, PlayIcon, SquareIcon } from "lucide-react";
import { useState } from "react";

import type { EngineInstall, SandboxFolderChoice } from "@shared/types/engine";

import { AppErrorView } from "@/components/AppErrorView";
import { BuildProgressView } from "@/components/BuildProgressView";
import { QuietBuildNotice } from "@/components/QuietBuildNotice";
import { Button } from "@/components/ui/button";
import { useSandboxBuild } from "@/data/useSandboxBuild";
import { buildOutcome } from "@/lib/buildOutcome";
import { formatElapsed } from "@/lib/formatting";
import { describeSandboxFailure } from "@/lib/sandboxFailure";

import { StepFrame } from "./StepFrame";

/** Props for BuildStep. */
interface BuildStepProps
{
	readonly engine: EngineInstall;
	readonly folder: SandboxFolderChoice;
	readonly onBack: () => void;
	readonly onNext: () => void;
}

/** Starts and follows the first sandbox build. */
export function BuildStep({ engine, folder, onBack, onNext }: BuildStepProps)
{
	const build = useSandboxBuild((client, runId) => client.createSandbox({ runId, enginePath: engine.path, folder: folder.path }), "first-run");
	const [showOutput, setShowOutput] = useState(false);
	const isRunning = build.status === "running";

	return (
		<StepFrame
			testId="first-run-build"
			title="First full build"
			lead={`Copies the sandbox template, ties it to UE ${engine.version}, and builds it once from scratch. The first build is the slow one: often 5 to 15 minutes. Later runs only rebuild what changed.`}
			footer={
				<>
					<Button variant="ghost" onClick={onBack} disabled={isRunning}>
						Back
					</Button>
					{build.status === "idle" && (
						<Button variant="pack" onClick={build.start}>
							<PlayIcon />
							Start the build
						</Button>
					)}
					{isRunning && (
						<Button variant="secondary" onClick={build.cancel}>
							<SquareIcon />
							Cancel
						</Button>
					)}
					{build.status === "succeeded" && (
						<Button variant="pack" onClick={onNext}>
							Continue
						</Button>
					)}
				</>
			}
		>
			{build.status !== "idle" && build.status !== "errored" && <BuildProgressView event={build.progress} outcome={buildOutcome(build.status)} elapsedMs={build.elapsedMs} />}
			{build.status === "running" && build.isQuiet && <QuietBuildNotice build={build} />}
			{build.status === "idle" && (
				<p className="rounded-lg border border-line bg-raised/50 p-4 text-sm text-paper-muted">
					You can keep using your computer while it builds. Cancelling is safe; the next start picks up from a clean copy.
				</p>
			)}
			{build.status === "succeeded" && build.result && (
				<p data-testid="build-succeeded" className="flex items-center gap-2 text-sm text-paper">
					<CircleCheckIcon className="size-4 text-pass" />
					The sandbox built in {formatElapsed(build.result.durationMs)}. It lives in <span className="font-mono text-xs break-all text-paper-muted">{build.result.sandboxPath}</span>
				</p>
			)}
			{build.status === "failed" && build.result && (
				<div data-testid="build-failed" className="flex flex-col gap-2">
					<AppErrorView error={describeSandboxFailure(build.result, "first-run")} onRetry={build.start} retryLabel="Build again" />
					{build.result.compilerOutput && (
						<button type="button" onClick={() => setShowOutput(!showOutput)} className="self-start text-xs text-paper-faint hover:text-paper-muted">
							{showOutput ? "Hide the compiler output" : "Show the compiler output"}
						</button>
					)}
					{showOutput && <pre className="max-h-40 overflow-auto rounded-md bg-ink p-3 font-mono text-2xs whitespace-pre-wrap text-paper-muted select-text">{build.result.compilerOutput}</pre>}
				</div>
			)}
			{build.status === "cancelled" && (
				<div data-testid="build-cancelled" className="flex items-center justify-between gap-3 rounded-lg border border-line bg-raised/50 p-4 text-sm text-paper-muted">
					The build was cancelled. Nothing is half done; starting again begins from a clean copy.
					<Button variant="secondary" size="sm" onClick={build.start}>
						Start again
					</Button>
				</div>
			)}
			{build.status === "errored" && build.error && (
				// A lost run cannot be started again here: the sandbox folder already holds the copy (A824).
				<AppErrorView error={build.error} onRetry={build.error.code === "run-not-found" ? undefined : build.start} retryLabel="Start again" />
			)}
		</StepFrame>
	);
}
