// Settings: loop mode (auto, fast, headless). On macOS the fast choice is off, because Live Coding is Windows only (A45).
import type { EnvironmentStatus } from "@shared/types/engine";
import type { LoopModeSetting, Settings } from "@shared/types/settings";

import { AppErrorView } from "@/components/AppErrorView";
import { Panel } from "@/components/Panel";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoAction } from "@/data/useDojoAction";
import { describeLoop } from "@/lib/loopDescription";
import { isMacPlatform } from "@/lib/platform";

import { SegmentedControl } from "./SegmentedControl";
import { SettingRow } from "./SettingRow";

/** Props for LoopPanel. */
interface LoopPanelProps
{
	readonly settings: Settings;
	readonly environment: EnvironmentStatus | undefined;
}

/** The loop mode control and what it means on this machine. */
export function LoopPanel({ settings, environment }: LoopPanelProps)
{
	const update = useDojoAction((client, loopMode: LoopModeSetting) => client.updateSettings({ loopMode }), [QUERY_KEYS.settings, QUERY_KEYS.environment]);
	const isMac = isMacPlatform();
	const loop = describeLoop(environment?.engine ?? null, settings.loopMode, isMac);

	return (
		<Panel title="How builds run" testId="settings-loop">
			<SettingRow label="Loop mode" description="Auto picks per run. Headless always builds with UnrealBuildTool and tests without the editor.">
				<SegmentedControl<LoopModeSetting>
					label="Loop mode"
					value={settings.loopMode}
					onChange={(value) => void update.run(value)}
					disabled={update.isPending}
					options={[
						{ value: "auto", label: "Auto" },
						{ value: "fast", label: isMac ? "Fast (Windows only)" : "Fast", disabled: isMac, title: isMac ? "Live Coding is not available on macOS." : undefined },
						{ value: "headless", label: "Headless" },
					]}
				/>
				<p data-testid="loop-detail" className="text-xs text-paper-muted">
					<span className="text-paper">{loop.label}.</span> {loop.detail}
				</p>
				{update.error && <AppErrorView error={update.error} compact />}
			</SettingRow>
		</Panel>
	);
}
