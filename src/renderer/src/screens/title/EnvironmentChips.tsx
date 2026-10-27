// The Title screen's environment chips: engine, build tools, sandbox, review provider, loop, and editor, from one IPC call, with the problems spelled out below them.
import { QueryView } from "@/components/QueryView";
import { StatusChip } from "@/components/StatusChip";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoQuery } from "@/data/useDojoQuery";
import { describeLoop } from "@/lib/loopDescription";
import { isMacPlatform } from "@/lib/platform";
import { engineChipState, toolchainChipState } from "@/lib/environmentChipStates";
import { reviewProviderLabel } from "@/lib/reviewProviderLabel";

import { EnvironmentProblems } from "./EnvironmentProblems";

/** Shows where the environment stands; each chip's tooltip explains it, and the problems are written out under the chips. */
export function EnvironmentChips()
{
	const environment = useDojoQuery(QUERY_KEYS.environment, (client) => client.getEnvironmentStatus());

	return (
		<div className="flex flex-col gap-3">
			<div className="font-mono text-2xs tracking-widest text-paper-faint uppercase">Environment</div>
			<QueryView query={environment} loadingHeight="h-9">
				{(status) =>
				{
					const loop = describeLoop(status.engine, status.loopMode, isMacPlatform());
					const engineChip = engineChipState(status);
					const toolchainChip = toolchainChipState(status.toolchain);

					return (
						<div className="flex flex-col gap-3">
							<div data-testid="environment-chips" className="flex flex-wrap gap-2">
								<StatusChip testId="chip-engine" label="Engine" value={engineChip.value} tone={engineChip.tone} title={engineChip.title} />
								{toolchainChip && <StatusChip testId="chip-toolchain" label="Build tools" value={toolchainChip.value} tone={toolchainChip.tone} title={toolchainChip.title} />}
								<StatusChip testId="chip-sandbox" label="Sandbox" value={status.sandbox.ready ? "Ready" : "Not built"} tone={status.sandbox.ready ? "pass" : "warn"} title={status.sandbox.path ?? undefined} />
								<StatusChip
									testId="chip-review"
									label="Review"
									value={status.reviewProvider ? reviewProviderLabel(status.reviewProvider.id) : "Tests only"}
									tone={status.reviewProvider ? "pass" : "warn"}
									title={status.reviewProvider?.version}
								/>
								<StatusChip testId="chip-loop" label="Loop" value={loop.label} tone={status.engine ? (loop.isFast ? "pass" : "neutral") : "fail"} title={loop.detail} />
								<StatusChip testId="chip-editor" label="Editor" value={status.editorConnected ? "Connected" : "Closed"} tone={status.editorConnected ? "pass" : "neutral"} />
							</div>
							<EnvironmentProblems status={status} />
						</div>
					);
				}}
			</QueryView>
		</div>
	);
}
