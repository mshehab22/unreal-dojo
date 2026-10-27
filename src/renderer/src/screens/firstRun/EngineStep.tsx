// Setup step 1: pick an Unreal install from the detected list or a folder, and check the build toolchain.
import { CircleCheckIcon, FolderOpenIcon } from "lucide-react";
import { useEffect, useState } from "react";

import type { EngineInstall } from "@shared/types/engine";

import { AppErrorView } from "@/components/AppErrorView";
import { LoadingBlock } from "@/components/LoadingBlock";
import { Button } from "@/components/ui/button";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoAction } from "@/data/useDojoAction";
import { useDojoQuery } from "@/data/useDojoQuery";

import { EngineOption } from "./EngineOption";
import { StepFrame } from "./StepFrame";

/** Props for EngineStep. */
interface EngineStepProps
{
	readonly selected: EngineInstall | null;
	readonly onSelect: (engine: EngineInstall) => void;
	readonly onNext: () => void;
}

/** Lists installs, lets the learner pick one or browse for a folder, and shows whether the toolchain can build. */
export function EngineStep({ selected, onSelect, onNext }: EngineStepProps)
{
	const engines = useDojoQuery(QUERY_KEYS.engines, (client) => client.detectEngines());
	const toolchain = useDojoQuery(QUERY_KEYS.toolchain, (client) => client.checkToolchain());
	const environment = useDojoQuery(QUERY_KEYS.environment, (client) => client.getEnvironmentStatus());
	const pickFolder = useDojoAction((client) => client.pickEngineFolder());
	const saveEngine = useDojoAction((client, enginePath: string) => client.updateSettings({ enginePath }), [QUERY_KEYS.settings, QUERY_KEYS.environment]);
	const [manual, setManual] = useState<EngineInstall | null>(null);

	const options = [...(engines.data ?? []), ...(manual ? [manual] : [])];
	const blockingProblem = toolchain.data?.problems.find((problem) => problem.blocksBuild);
	const canContinue = selected !== null && toolchain.data !== undefined && !blockingProblem && !saveEngine.isPending;

	// Preselect the newest detected install so the common case is one click.
	useEffect(() =>
	{
		const newest = engines.data?.[0];

		if (!selected && newest) onSelect(newest);
	}, [engines.data, selected, onSelect]);

	/** Stores the chosen engine in settings, then moves on. */
	const confirmEngine = async (): Promise<void> =>
	{
		if (selected && (await saveEngine.run(selected.path))) onNext();
	};

	/** Opens the folder picker and selects what it returns. */
	const browse = async (): Promise<void> =>
	{
		const picked = await pickFolder.run();

		if (picked)
		{
			setManual(picked);
			onSelect(picked);
		}
	};

	return (
		<StepFrame
			testId="first-run-engine"
			title="Pick the engine"
			lead="Quests build against a real Unreal install. 5.8 or later is best; 5.4 to 5.7 work with the slower headless loop."
			footer={
				<Button variant="pack" onClick={confirmEngine} disabled={!canContinue}>
					Use this engine
				</Button>
			}
		>
			{environment.data?.engineProblem && (
				<div data-testid="first-run-engine-problem">
					<AppErrorView error={environment.data.engineProblem} compact />
				</div>
			)}
			{engines.error && <AppErrorView error={engines.error} onRetry={engines.reload} retryLabel="Look again" />}
			{!engines.data && !engines.error && <LoadingBlock height="h-20" />}
			{engines.data && options.length === 0 && (
				<p className="rounded-lg border border-dashed border-line-strong p-4 text-sm text-paper-muted">
					No Unreal install was found in the usual places. If it lives somewhere else, pick its folder (the one that contains Engine).
				</p>
			)}
			<div role="radiogroup" aria-label="Engine installs" className="flex flex-col gap-2">
				{options.map((engine) => (
					<EngineOption key={engine.path} engine={engine} isSelected={selected?.path === engine.path} onSelect={() => onSelect(engine)} />
				))}
			</div>
			<div>
				<Button variant="ghost" size="sm" onClick={browse} disabled={pickFolder.isPending}>
					<FolderOpenIcon />
					Pick a folder instead
				</Button>
			</div>
			{pickFolder.error && <AppErrorView error={pickFolder.error} compact onRetry={browse} />}
			{saveEngine.error && <AppErrorView error={saveEngine.error} compact onRetry={confirmEngine} />}

			<div className="flex flex-col gap-2 border-t border-line pt-4">
				<div className="font-mono text-2xs tracking-widest text-paper-faint uppercase">Build toolchain</div>
				{toolchain.error && <AppErrorView error={toolchain.error} onRetry={toolchain.reload} retryLabel="Check again" />}
				{!toolchain.data && !toolchain.error && <LoadingBlock height="h-10" />}
				{toolchain.data && toolchain.data.problems.length === 0 && (
					<p data-testid="toolchain-ok" className="flex items-center gap-2 text-sm text-paper-muted">
						<CircleCheckIcon className="size-4 text-pass" />
						{toolchain.data.message}
					</p>
				)}
				{toolchain.data?.problems.map((problem) => (
					<AppErrorView key={problem.error.message} error={problem.error} onRetry={toolchain.reload} retryLabel="Check again" compact />
				))}
			</div>
		</StepFrame>
	);
}
