// Settings' "Set up the sandbox again" (M5.1k): first-run's folder and first-build steps, opened inside the Sandbox row, for a sandbox that was moved or deleted.
import { useState } from "react";

import type { EngineInstall, SandboxFolderChoice } from "@shared/types/engine";

import { parentFolderOf } from "@/lib/sandboxSetupAgain";

import { BuildStep } from "../firstRun/BuildStep";
import { SandboxStep } from "../firstRun/SandboxStep";

/** Props for SandboxSetupAgain. */
interface SandboxSetupAgainProps
{
	readonly engine: EngineInstall;

	/** The sandbox folder in Settings before this setup, or null when there is none. */
	readonly previousSandboxPath: string | null;

	/** Closes the flow: Cancel on the folder step, or Continue after the build passed. */
	readonly onClose: () => void;
}

/** Choose a folder, then copy the template and build it once, with the same components, calls, progress, and error views as first run. */
export function SandboxSetupAgain({ engine, previousSandboxPath, onClose }: SandboxSetupAgainProps)
{
	const [step, setStep] = useState<"folder" | "build">("folder");
	const [folder, setFolder] = useState<SandboxFolderChoice | null>(null);
	const previousParent = previousSandboxPath === null ? null : parentFolderOf(previousSandboxPath);

	return (
		<div data-testid="sandbox-setup-again" className="flex flex-col gap-3">
			<p className="text-xs text-paper-muted">
				This creates a new sandbox and builds it once with UE {engine.version}. Your progress is kept; it is saved outside the sandbox.
				{previousParent !== null && (
					<>
						{" "}To put it back where it was, choose <span className="font-mono break-all text-paper select-text">{previousParent}</span>.
					</>
				)}
			</p>
			{step === "folder" && <SandboxStep folder={folder} onChoose={setFolder} onBack={onClose} onNext={() => setStep("build")} backLabel="Cancel" />}
			{step === "build" && folder && <BuildStep engine={engine} folder={folder} onBack={() => setStep("folder")} onNext={onClose} context="setup-again" />}
		</div>
	);
}
