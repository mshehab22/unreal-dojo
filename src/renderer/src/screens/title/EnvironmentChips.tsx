// The Title screen's environment chips: engine, sandbox, review provider, loop, and editor, from one IPC call.
import { QueryView } from "@/components/QueryView";
import { StatusChip } from "@/components/StatusChip";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoQuery } from "@/data/useDojoQuery";
import { describeLoop } from "@/lib/loopDescription";
import { isMacPlatform } from "@/lib/platform";
import { reviewProviderLabel } from "@/lib/reviewProviderLabel";

/** Shows where the environment stands; each chip's tooltip explains it. */
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

					return (
						<div data-testid="environment-chips" className="flex flex-wrap gap-2">
							<StatusChip testId="chip-engine" label="Engine" value={status.engine ? `UE ${status.engine.version}` : "Not set"} tone={status.engine ? "pass" : "fail"} title={status.engine?.path} />
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
					);
				}}
			</QueryView>
		</div>
	);
}
