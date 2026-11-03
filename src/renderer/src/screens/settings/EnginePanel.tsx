// Settings: the engine path, the build tools, and the sandbox, with the environment problems explained; the sandbox row has a clean rebuild and Set up the sandbox again.
import { FolderOpenIcon } from "lucide-react";

import type { EnvironmentStatus } from "@shared/types/engine";
import type { Settings } from "@shared/types/settings";

import { AppErrorView } from "@/components/AppErrorView";
import { Panel } from "@/components/Panel";
import { SaveNoticeView } from "@/components/SaveNoticeView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoAction } from "@/data/useDojoAction";

import { SandboxRow } from "./SandboxRow";
import { SettingRow } from "./SettingRow";
import { ToolchainRow } from "./ToolchainRow";

/** Props for EnginePanel. */
interface EnginePanelProps
{
	readonly settings: Settings;
	readonly environment: EnvironmentStatus | undefined;
}

/** Engine, build tools, and sandbox rows. */
export function EnginePanel({ settings, environment }: EnginePanelProps)
{
	const pickEngine = useDojoAction(async (client) =>
	{
		const picked = await client.pickEngineFolder();

		if (picked) await client.updateSettings({ enginePath: picked.path });

		return picked;
	}, [QUERY_KEYS.settings, QUERY_KEYS.environment]);

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
				{environment?.engineProblem && <AppErrorView error={environment.engineProblem} compact />}
				{pickEngine.error && <AppErrorView error={pickEngine.error} compact />}
				<SaveNoticeView notice={environment?.saveNotice} compact />
			</SettingRow>
			{environment?.toolchain && <ToolchainRow toolchain={environment.toolchain} />}
			<SandboxRow settings={settings} environment={environment} />
		</Panel>
	);
}
