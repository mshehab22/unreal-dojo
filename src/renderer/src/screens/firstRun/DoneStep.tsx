// Setup step 5: a summary of what was set up, and the button that finishes first run and opens the Studio.
import { ArrowRightIcon } from "lucide-react";

import type { EngineInstall, SandboxFolderChoice } from "@shared/types/engine";

import { AppErrorView } from "@/components/AppErrorView";
import { Button } from "@/components/ui/button";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoAction } from "@/data/useDojoAction";
import { describeLoop } from "@/lib/loopDescription";
import { isMacPlatform } from "@/lib/platform";

import { StepFrame } from "./StepFrame";

/** Props for DoneStep. */
interface DoneStepProps
{
	readonly engine: EngineInstall;
	readonly folder: SandboxFolderChoice;
	readonly onFinished: () => void;
}

/** Shows the setup summary and marks first run complete. */
export function DoneStep({ engine, folder, onFinished }: DoneStepProps)
{
	const complete = useDojoAction((client) => client.completeFirstRun(), [QUERY_KEYS.settings, QUERY_KEYS.environment]);
	const loop = describeLoop(engine, "auto", isMacPlatform());

	/** Finishes setup and moves on once it is saved. */
	const finish = async (): Promise<void> =>
	{
		if (await complete.run()) onFinished();
	};

	const rows: readonly [string, string][] = [
		["Engine", `UE ${engine.version}`],
		["Sandbox", folder.path],
		["How builds run", loop.label],
	];

	return (
		<StepFrame
			testId="first-run-done"
			title="Your studio is ready"
			lead="Everything below can be changed later in Settings. Your first contract is waiting on the World Map."
			footer={
				<Button variant="pack" size="lg" onClick={finish} disabled={complete.isPending}>
					Enter your studio
					<ArrowRightIcon />
				</Button>
			}
		>
			<dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
				{rows.map(([label, value]) => (
					<div key={label} className="contents">
						<dt className="font-mono text-2xs tracking-widest text-paper-faint uppercase">{label}</dt>
						<dd className="min-w-0 break-all text-paper">{value}</dd>
					</div>
				))}
			</dl>
			<p className="text-xs text-paper-faint">{loop.detail}</p>
			{complete.error && <AppErrorView error={complete.error} onRetry={finish} />}
		</StepFrame>
	);
}
