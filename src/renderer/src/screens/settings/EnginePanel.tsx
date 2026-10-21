// Settings: the engine path and the sandbox, with a clean rebuild that shows its progress.
import { FolderOpenIcon, HammerIcon, SquareIcon } from "lucide-react";

import type { EnvironmentStatus } from "@shared/types/engine";
import type { Settings } from "@shared/types/settings";

import { AppErrorView } from "@/components/AppErrorView";
import { BuildProgressView } from "@/components/BuildProgressView";
import { Panel } from "@/components/Panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoAction } from "@/data/useDojoAction";
import { useSandboxBuild } from "@/data/useSandboxBuild";
import { buildOutcome } from "@/lib/buildOutcome";
import { formatElapsed } from "@/lib/formatting";
import { explainSandboxFailure } from "@/lib/sandboxFailure";

import { SettingRow } from "./SettingRow";

/** Props for EnginePanel. */
interface EnginePanelProps
{
	readonly settings: Settings;
	readonly environment: EnvironmentStatus | undefined;
}

/** Engine and sandbox rows. */
export function EnginePanel({ settings, environment }: EnginePanelProps)
{
	const pickEngine = useDojoAction(async (client) =>
	{
		const picked = await client.pickEngineFolder();

		if (picked) await client.updateSettings({ enginePath: picked.path });

		return picked;
	}, [QUERY_KEYS.settings, QUERY_KEYS.environment]);
	const rebuild = useSandboxBuild((client, runId) => client.rebuildSandbox(runId));

	return (
		<Panel title="Engine and sandbox" testId="settings-engine">
			<SettingRow label="Engine" description="The Unreal install quests build against.">
				<div className="flex flex-wrap items-center gap-2">
					{environment?.engine && <Badge variant="pass">UE {environment.engine.version}</Badge>}
					<span className="min-w-0 font-mono text-xs break-all text-paper-muted">{settings.enginePath ?? "Not set"}</span>
				</div>
				<Button variant="secondary" size="sm" className="self-start" onClick={() => void pickEngine.run()} disabled={pickEngine.isPending}>
					<FolderOpenIcon />
					Pick another engine
				</Button>
				{pickEngine.error && <AppErrorView error={pickEngine.error} compact />}
			</SettingRow>
			<SettingRow label="Sandbox" description="The practice project where your code is compiled and tested.">
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant={environment?.sandbox.ready ? "pass" : "warn"}>{environment?.sandbox.ready ? "Ready" : "Not built"}</Badge>
					<span className="min-w-0 font-mono text-xs break-all text-paper-muted">{settings.sandboxPath ?? "Not created yet"}</span>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="secondary" size="sm" onClick={rebuild.start} disabled={rebuild.status === "running" || !settings.sandboxPath}>
						<HammerIcon />
						Rebuild sandbox
					</Button>
					{rebuild.status === "running" && (
						<Button variant="ghost" size="sm" onClick={rebuild.cancel}>
							<SquareIcon />
							Cancel
						</Button>
					)}
				</div>
				{rebuild.status !== "idle" && rebuild.status !== "errored" && <BuildProgressView event={rebuild.progress} outcome={buildOutcome(rebuild.status)} />}
				{rebuild.status === "cancelled" && <p className="text-xs text-paper-muted">The rebuild was cancelled. The sandbox keeps its last good build.</p>}
				{rebuild.status === "succeeded" && rebuild.result && <p className="text-xs text-pass">Rebuilt in {formatElapsed(rebuild.result.durationMs)}.</p>}
				{rebuild.status === "failed" && rebuild.result && <AppErrorView error={{ code: "sandbox-not-ready", ...explainSandboxFailure(rebuild.result.compilerOutput, "rebuild"), detail: rebuild.result.compilerOutput }} onRetry={rebuild.start} />}
				{rebuild.status === "errored" && rebuild.error && <AppErrorView error={rebuild.error} onRetry={rebuild.start} />}
			</SettingRow>
		</Panel>
	);
}
