// How build quests will run on this machine, in plain words. The Mac never gets the fast loop promise (A45).
import type { EngineInstall } from "@shared/types/engine";
import type { LoopModeSetting } from "@shared/types/settings";

/** A short label and a sentence explaining it. */
export interface LoopDescription
{
	label: string;
	detail: string;
	isFast: boolean;
}

/** What the loop mode means for this engine on this OS. On macOS Live Coding does not exist, so builds always use the headless loop. */
export function describeLoop(engine: Pick<EngineInstall, "supportsFastLoop" | "version"> | null, loopMode: LoopModeSetting, isMac: boolean): LoopDescription
{
	if (!engine) return { label: "No engine", detail: "Pick an engine to see how builds will run.", isFast: false };

	if (loopMode === "headless") return { label: "Headless loop", detail: "Every run builds with UnrealBuildTool and tests without the editor.", isFast: false };

	if (isMac)
	{
		return {
			label: "Headless loop",
			detail: "Live Coding is Windows only, so builds on macOS use UnrealBuildTool. An open editor only re-runs tests on code it already loaded.",
			isFast: false,
		};
	}

	if (!engine.supportsFastLoop)
	{
		return { label: "Headless loop", detail: `UE ${engine.version} has no editor MCP server; the fast loop needs 5.8 or later.`, isFast: false };
	}

	return loopMode === "fast"
		? { label: "Fast loop", detail: "Runs use Live Coding and the open editor's MCP server.", isFast: true }
		: { label: "Fast loop when the editor is open", detail: "Live Coding when the editor is open and the change allows it; a headless build otherwise.", isFast: true };
}
