// The Sandbox row of Settings: where the sandbox is and whether it is built, a clean rebuild with its progress, and "Set up the sandbox again" for a sandbox that was moved or deleted (M5.1k).
import { FolderPlusIcon, HammerIcon, SquareIcon } from "lucide-react";
import { useState } from "react";

import type { EngineInstall, EnvironmentStatus } from "@shared/types/engine";
import type { Settings } from "@shared/types/settings";

import { AppErrorView } from "@/components/AppErrorView";
import { BuildProgressView } from "@/components/BuildProgressView";
import { QuietBuildNotice } from "@/components/QuietBuildNotice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSandboxBuild } from "@/data/useSandboxBuild";
import { buildOutcome } from "@/lib/buildOutcome";
import { formatElapsed } from "@/lib/formatting";
import { describeRebuildFailure, describeRebuildRefusal } from "@/lib/sandboxFailure";
import { sandboxLooksMissing, setupAgainBlocker } from "@/lib/sandboxSetupAgain";

import { SandboxSetupAgain } from "./SandboxSetupAgain";
import { SettingRow } from "./SettingRow";

/** Props for SandboxRow. */
interface SandboxRowProps
{
	readonly settings: Settings;
	readonly environment: EnvironmentStatus | undefined;
}

/** The sandbox path and state, Rebuild sandbox, and Set up the sandbox again. Only one of the two runs at a time. */
export function SandboxRow({ settings, environment }: SandboxRowProps)
{
	const rebuild = useSandboxBuild((client, runId) => client.rebuildSandbox(runId), "rebuild");
	// The engine is captured when the steps open, so a refreshed environment that loses the engine cannot close them mid-build.
	const [setupEngine, setSetupEngine] = useState<EngineInstall | null>(null);
	const [showsRebuild, setShowsRebuild] = useState(true);
	const isSettingUpAgain = setupEngine !== null;
	const isRebuilding = rebuild.status === "running";
	const blocker = setupAgainBlocker(environment);

	/** Starts a rebuild and shows its progress. */
	const startRebuild = (): void =>
	{
		setShowsRebuild(true);
		rebuild.start();
	};

	/** Opens the setup steps and hides the last rebuild's outcome, which is about the sandbox being replaced. */
	const openSetupAgain = (): void =>
	{
		if (!environment?.engine) return;

		setShowsRebuild(false);
		setSetupEngine(environment.engine);
	};

	return (
		<SettingRow label="Sandbox" description="The practice project where your code is compiled and tested." testId="settings-sandbox">
			<div className="flex flex-wrap items-center gap-2">
				<Badge variant={environment?.sandbox.ready ? "pass" : "warn"}>{environment?.sandbox.ready ? "Ready" : "Not built"}</Badge>
				<span className="min-w-0 font-mono text-xs break-all text-paper-muted">{settings.sandboxPath ?? "Not created yet"}</span>
			</div>
			{sandboxLooksMissing(settings, environment) && !isSettingUpAgain && (
				<p data-testid="sandbox-missing-hint" className="text-xs text-paper-muted">
					If this folder was moved or deleted, put it back, or use Set up the sandbox again to create a new one.
				</p>
			)}
			<div className="flex flex-wrap items-center gap-2">
				<Button variant="secondary" size="sm" onClick={startRebuild} disabled={isRebuilding || isSettingUpAgain || !settings.sandboxPath}>
					<HammerIcon />
					Rebuild sandbox
				</Button>
				{isRebuilding && (
					<Button variant="ghost" size="sm" onClick={rebuild.cancel}>
						<SquareIcon />
						Cancel
					</Button>
				)}
				<Button variant="secondary" size="sm" onClick={openSetupAgain} disabled={isRebuilding || isSettingUpAgain || blocker !== null}>
					<FolderPlusIcon />
					Set up the sandbox again
				</Button>
			</div>
			{blocker !== null && environment !== undefined && <p className="text-xs text-paper-faint">{blocker}</p>}
			{showsRebuild && (
				<>
					{rebuild.status !== "idle" && rebuild.status !== "errored" && <BuildProgressView event={rebuild.progress} outcome={buildOutcome(rebuild.status)} elapsedMs={rebuild.elapsedMs} />}
					{isRebuilding && rebuild.isQuiet && <QuietBuildNotice build={rebuild} />}
					{rebuild.status === "cancelled" && <p className="text-xs text-paper-muted">The rebuild was cancelled. The sandbox keeps its last good build.</p>}
					{rebuild.status === "succeeded" && rebuild.result && <p className="text-xs text-pass">Rebuilt in {formatElapsed(rebuild.result.durationMs)}.</p>}
					{rebuild.status === "failed" && rebuild.result && <AppErrorView error={describeRebuildFailure(rebuild.result)} onRetry={startRebuild} />}
					{rebuild.status === "errored" && rebuild.error && (
						// A sandbox that is gone cannot be rebuilt, so its error offers no retry; its advice names Set up the sandbox again.
						<AppErrorView error={describeRebuildRefusal(rebuild.error)} onRetry={rebuild.error.code === "sandbox-not-ready" ? undefined : startRebuild} />
					)}
				</>
			)}
			{setupEngine !== null && <SandboxSetupAgain engine={setupEngine} previousSandboxPath={settings.sandboxPath} onClose={() => setSetupEngine(null)} />}
		</SettingRow>
	);
}
