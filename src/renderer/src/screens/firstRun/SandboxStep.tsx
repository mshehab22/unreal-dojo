// Setup step 2: choose the folder the practice project is created in, with the short path warning when it applies.
import { FolderOpenIcon, TriangleAlertIcon } from "lucide-react";

import type { SandboxFolderChoice } from "@shared/types/engine";

import { AppErrorView } from "@/components/AppErrorView";
import { Button } from "@/components/ui/button";
import { useDojoAction } from "@/data/useDojoAction";

import { StepFrame } from "./StepFrame";

/** Props for SandboxStep. */
interface SandboxStepProps
{
	readonly folder: SandboxFolderChoice | null;
	readonly onChoose: (folder: SandboxFolderChoice) => void;
	readonly onBack: () => void;
	readonly onNext: () => void;
}

/** Folder picker for the sandbox project, showing the chosen path and any warnings. */
export function SandboxStep({ folder, onChoose, onBack, onNext }: SandboxStepProps)
{
	const pick = useDojoAction((client) => client.pickSandboxFolder());

	/** Opens the picker and keeps the answer unless the learner cancelled. */
	const choose = async (): Promise<void> =>
	{
		const chosen = await pick.run();

		if (chosen) onChoose(chosen);
	};

	return (
		<StepFrame
			testId="first-run-sandbox"
			title="Choose a folder for the sandbox"
			lead="The sandbox is a small Unreal project where your quest code is compiled and tested. It needs about 6 GB once built. A short path keeps Unreal's build tools happy."
			footer={
				<>
					<Button variant="ghost" onClick={onBack}>
						Back
					</Button>
					<Button variant="pack" onClick={onNext} disabled={!folder}>
						Use this folder
					</Button>
				</>
			}
		>
			<div className="flex flex-wrap items-center gap-3">
				<Button variant="secondary" onClick={choose} disabled={pick.isPending}>
					<FolderOpenIcon />
					{folder ? "Choose another folder" : "Choose a folder"}
				</Button>
			</div>
			{folder && (
				<div data-testid="sandbox-folder" className="flex flex-col gap-2 rounded-lg border border-line bg-raised/50 p-4">
					<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">The sandbox will be created in</span>
					<span className="font-mono text-sm break-all text-paper select-text">{folder.path}</span>
				</div>
			)}
			{folder?.warnings.map((warning) => (
				<p key={warning} data-testid="sandbox-warning" className="flex gap-2 rounded-lg border border-warn/30 bg-warn/[0.06] p-3 text-sm text-paper">
					<TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-warn" />
					{warning}
				</p>
			))}
			{pick.error && <AppErrorView error={pick.error} onRetry={choose} />}
		</StepFrame>
	);
}
