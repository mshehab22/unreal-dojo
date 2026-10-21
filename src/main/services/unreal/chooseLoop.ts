// Decides fast loop or headless loop for one run, with the reason the progress stream shows (D09, A45).
import type { LoopModeSetting } from "@shared/types/settings";

import type { BuiltQuestSnapshot } from "./FullBuildLedger";

/** Macros that mark a header as declaring reflected types; Live Coding cannot patch changes to them (research 9.6). */
const REFLECTION_MACRO = /\b(UCLASS|USTRUCT|UENUM|UINTERFACE|UPROPERTY|UFUNCTION|UDELEGATE|GENERATED_BODY|GENERATED_UCLASS_BODY|DECLARE_DYNAMIC_\w+)\b/;

/** Everything the decision depends on, gathered by the caller. */
export interface LoopChoiceInput
{
	loopMode: LoopModeSetting;

	/** True for 5.8 and later. */
	engineSupportsFastLoop: boolean;

	/** True on Windows. */
	liveCodingAvailable: boolean;

	/** The editor the app opened, with whether its server answered just now; null when none is open. */
	editor: { launchedAt: number; answering: boolean } | null;

	/** When the last full build finished, or null. */
	lastFullBuildAt: number | null;

	/** What the last full build compiled for this quest, or null. */
	builtSnapshot: BuiltQuestSnapshot | null;

	/** True when other quests' files in the sandbox were written or removed since the last full build (prerequisite fill, reset). */
	sandboxChangedSinceBuild: boolean;

	/** The files and tests of this run. */
	files: Record<string, string>;
	tests: string;
}

/** The decision. `editorStale` is true when the open editor no longer has the code on disk and should be restarted (macOS). */
export interface LoopChoice
{
	loop: "fast" | "headless";
	reason: string;
	editorStale: boolean;
}

/** Applies the rules in order; the first that says headless wins. A "fast" setting that cannot be honored falls back with the reason. */
export function chooseLoop(input: LoopChoiceInput): LoopChoice
{
	const headless = (reason: string, editorStale = false): LoopChoice => ({ loop: "headless", reason: input.loopMode === "fast" ? `Fast loop is set in Settings, but ${lowerFirst(reason)}` : reason, editorStale });

	if (input.loopMode === "headless") return { loop: "headless", reason: "Full build: the headless loop is set in Settings.", editorStale: false };
	if (!input.engineSupportsFastLoop) return headless("Full build: this engine is older than 5.8, which has no editor MCP server.");
	if (!input.editor) return headless("Full build: the editor is not open (open it from Unreal Dojo for the fast loop).");
	if (!input.editor.answering) return headless("Full build: the editor's MCP server is not answering.");

	const snapshot = input.builtSnapshot;
	const editorStale = input.lastFullBuildAt !== null && input.lastFullBuildAt > input.editor.launchedAt;

	if (input.sandboxChangedSinceBuild) return headless("Full build: other quests' files in the sandbox changed since the last full build.", editorStale);

	if (input.liveCodingAvailable)
	{
		if (editorStale) return headless("Full build: a build finished after the editor opened, so it is not running that code.", true);
		if (!snapshot) return headless("Full build: this quest has not been fully built yet this session.");
		if (snapshot.tests !== input.tests) return headless("Full build: the quest's tests changed since its last full build.");

		const structuralChange = describeStructuralChange(snapshot.files, input.files);
		if (structuralChange) return headless(`Full build: ${structuralChange}`);

		return { loop: "fast", reason: "Fast loop: Live Coding in the open editor (only .cpp or plain header changes since the last full build).", editorStale: false };
	}

	// macOS: no Live Coding, so the editor runs exactly the code it loaded at launch (A45). That build must be the latest one, and this quest's record must come from it.
	const unchanged = snapshot !== null && snapshot.tests === input.tests && sameFiles(snapshot.files, input.files);
	const fromLatestBuild = snapshot !== null && snapshot.builtAt === input.lastFullBuildAt;

	if (editorStale) return headless("Full build: the open editor still has older code. Restart the editor to use the fast loop again.", true);
	if (!unchanged || snapshot === null || snapshot.builtAt > input.editor.launchedAt) return headless("Full build: the code changed, and Live Coding is not available on the Mac.");
	if (!fromLatestBuild) return headless("Full build: another quest was built after this one, so this quest's code is built again before its tests run in the editor.");

	return { loop: "fast", reason: "Fast loop: the code is unchanged since the editor loaded it, so only the tests run again.", editorStale: false };
}

/** Why a change needs a full build (a file added or removed, or a reflected header changed), or null when Live Coding can take it. */
function describeStructuralChange(builtFiles: Record<string, string>, currentFiles: Record<string, string>): string | null
{
	const builtNames = Object.keys(builtFiles).sort();
	const currentNames = Object.keys(currentFiles).sort();

	if (builtNames.join("\n") !== currentNames.join("\n")) return "files were added or removed since the last full build.";

	for (const name of currentNames)
	{
		const before = builtFiles[name] ?? "";
		const after = currentFiles[name] ?? "";

		if (before !== after && name.endsWith(".h") && (REFLECTION_MACRO.test(before) || REFLECTION_MACRO.test(after))) return `${name} declares reflected types and changed since the last full build.`;
	}

	return null;
}

/** True when both maps have the same names and contents. */
function sameFiles(left: Record<string, string>, right: Record<string, string>): boolean
{
	const leftNames = Object.keys(left);

	return leftNames.length === Object.keys(right).length && leftNames.every((name) => right[name] === left[name]);
}

/** Lower-cases the first letter, to continue a sentence. */
function lowerFirst(text: string): string
{
	return text.charAt(0).toLowerCase() + text.slice(1);
}
