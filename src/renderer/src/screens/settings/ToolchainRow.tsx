// Settings: the Visual Studio or Xcode build tools row, with every problem the last check found explained in plain words.
import type { ToolchainCheck } from "@shared/types/engine";

import { ToolchainProblemList } from "@/components/ToolchainProblemList";
import { Badge } from "@/components/ui/badge";
import { toolchainChipState } from "@/lib/environmentChipStates";

import { SettingRow } from "./SettingRow";

/** Props for ToolchainRow. */
interface ToolchainRowProps
{
	readonly toolchain: ToolchainCheck;
}

/** Shows whether the build tools can build, and what to do about each problem. */
export function ToolchainRow({ toolchain }: ToolchainRowProps)
{
	const state = toolchainChipState(toolchain);
	const variant = state?.tone === "fail" ? "fail" : state?.tone === "warn" ? "warn" : "pass";

	return (
		<SettingRow label="Build tools" description="Visual Studio on Windows or Xcode on macOS, which Unreal needs to compile C++." testId="settings-toolchain">
			<div className="flex flex-wrap items-center gap-2">
				<Badge variant={variant}>{state?.value ?? "OK"}</Badge>
				{toolchain.problems.length === 0 && <span className="min-w-0 text-xs text-paper-muted">{toolchain.message}</span>}
			</div>
			<ToolchainProblemList problems={toolchain.problems} />
		</SettingRow>
	);
}
