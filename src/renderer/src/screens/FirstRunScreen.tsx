// First-run setup: engine, sandbox folder, the first full build, the editor once, then into the Studio.
import { useCallback, useState } from "react";

import type { EngineInstall, SandboxFolderChoice } from "@shared/types/engine";

import { useNavigate } from "@/app/router/useRoute";
import { ScreenHeader } from "@/components/ScreenHeader";

import { BuildStep } from "./firstRun/BuildStep";
import { DoneStep } from "./firstRun/DoneStep";
import { EditorStep } from "./firstRun/EditorStep";
import { EngineStep } from "./firstRun/EngineStep";
import type { FirstRunStepId } from "./firstRun/firstRunSteps";
import { SandboxStep } from "./firstRun/SandboxStep";
import { StepRail } from "./firstRun/StepRail";

/** Walks a new learner through setup, one step at a time. Each step explains its own failures and offers a retry. */
export function FirstRunScreen()
{
	const navigate = useNavigate();
	const [step, setStep] = useState<FirstRunStepId>("engine");
	const [engine, setEngine] = useState<EngineInstall | null>(null);
	const [folder, setFolder] = useState<SandboxFolderChoice | null>(null);
	const selectEngine = useCallback((chosen: EngineInstall) => setEngine(chosen), []);

	return (
		<section data-testid="screen-firstRun" className="mx-auto flex w-full max-w-5xl flex-col gap-8">
			<ScreenHeader eyebrow="First-run setup" title="Set up your studio" summary="A few steps, once. After this, every quest compiles and tests in your own Unreal sandbox." />
			<div className="grid grid-cols-[13rem_minmax(0,1fr)] items-start gap-6">
				<StepRail current={step} />
				{step === "engine" && <EngineStep selected={engine} onSelect={selectEngine} onNext={() => setStep("sandbox")} />}
				{step === "sandbox" && <SandboxStep folder={folder} onChoose={setFolder} onBack={() => setStep("engine")} onNext={() => setStep("build")} />}
				{step === "build" && engine && folder && <BuildStep engine={engine} folder={folder} onBack={() => setStep("sandbox")} onNext={() => setStep("editor")} />}
				{step === "editor" && <EditorStep onBack={() => setStep("build")} onNext={() => setStep("done")} />}
				{step === "done" && engine && folder && <DoneStep engine={engine} folder={folder} onFinished={() => navigate("studio")} />}
			</div>
		</section>
	);
}
