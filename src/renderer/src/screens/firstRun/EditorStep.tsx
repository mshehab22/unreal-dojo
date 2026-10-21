// Setup step 4: open the Unreal editor on the sandbox once, so its first-launch work is done before the first quest. Optional.
import { CircleCheckIcon, MonitorPlayIcon } from "lucide-react";

import { AppErrorView } from "@/components/AppErrorView";
import { Button } from "@/components/ui/button";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoAction } from "@/data/useDojoAction";
import { useDojoQuery } from "@/data/useDojoQuery";
import { isMacPlatform } from "@/lib/platform";

import { StepFrame } from "./StepFrame";

/** Props for EditorStep. */
interface EditorStepProps
{
	readonly onBack: () => void;
	readonly onNext: () => void;
}

/** Offers to open the editor once; skipping is fine. Never promises the fast loop on macOS (A45). */
export function EditorStep({ onBack, onNext }: EditorStepProps)
{
	const environment = useDojoQuery(QUERY_KEYS.environment, (client) => client.getEnvironmentStatus());
	const openEditor = useDojoAction((client) => client.openEditor(null), [QUERY_KEYS.environment]);
	const isConnected = environment.data?.editorConnected === true;
	const lead = isMacPlatform()
		? "The first launch compiles shaders and can take a few minutes. On macOS the editor is where you watch your mechanics run; builds and tests use the headless loop."
		: "The first launch compiles shaders and can take a few minutes. With UE 5.8 the open editor also gives you the fast loop: Live Coding and tests in seconds.";

	return (
		<StepFrame
			testId="first-run-editor"
			title="Open the editor once"
			lead={lead}
			footer={
				<>
					<Button variant="ghost" onClick={onBack}>
						Back
					</Button>
					{!isConnected && (
						<Button variant="ghost" onClick={onNext}>
							Skip for now
						</Button>
					)}
					<Button variant="pack" onClick={onNext} disabled={!isConnected}>
						Continue
					</Button>
				</>
			}
		>
			<div className="flex items-center gap-4">
				<Button variant="secondary" onClick={() => void openEditor.run()} disabled={openEditor.isPending || isConnected}>
					<MonitorPlayIcon />
					{openEditor.isPending ? "Opening the editor" : "Open the editor"}
				</Button>
				{isConnected && (
					<span data-testid="editor-connected" className="flex items-center gap-2 text-sm text-paper">
						<CircleCheckIcon className="size-4 text-pass" />
						The editor is open on the sandbox.
					</span>
				)}
			</div>
			{openEditor.error && <AppErrorView error={openEditor.error} onRetry={() => void openEditor.run()} />}
		</StepFrame>
	);
}
