// The fake engine's failure that is not the learner's code: a marker line in a file stands in for Live Coding being active in the open editor.
import type { AppError } from "@shared/types/errors";

/** The comment line a learner (or a test) puts in any file to make the fake engine fail for a reason outside the code. */
export const OUTSIDE_FAILURE_MARKER = "// dojo:fake-outside-failure";

/** The compiler output the fake prints for an outside failure: the build never reached the learner's files. */
export const OUTSIDE_FAILURE_OUTPUT = [
	"LogLiveCoding: Display: Live Coding is active in this editor session.",
	"UnrealBuildTool: ERROR: Unable to build while Live Coding is active. Exit the editor, or press Ctrl+Alt+F11 to build from it.",
	"Result: Failed (OtherCompilationError)",
].join("\n");

/** True when any of the files carries the outside-failure marker on a line of its own. */
export function hasOutsideFailureMarker(files: Record<string, string>): boolean
{
	return Object.values(files).some((text) => text.split(/\r?\n/).some((line) => line.trim() === OUTSIDE_FAILURE_MARKER));
}

/** The error the fake reports for the marker, worded as the real engine pipeline words a Live Coding conflict. */
export function outsideFailureError(): AppError
{
	return {
		code: "build-environment-failed",
		message: "The build could not run because Live Coding is active in the Unreal Editor you have open. Your code was never compiled.",
		suggestedAction: "Close the Unreal Editor or let its Live Coding session finish, then try again. Nothing was counted against you.",
		detail: "LogLiveCoding: Display: Live Coding is active in this editor session.\nUnrealBuildTool: ERROR: Unable to build while Live Coding is active.",
	};
}
