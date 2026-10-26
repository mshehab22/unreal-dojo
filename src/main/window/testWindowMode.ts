// Decides whether the e2e harness asked for a hidden window, so test runs never take over the screen (A970).

/** Set to 1 by the e2e harness: the window renders off screen, never takes focus, and the macOS Dock icon stays hidden. */
export const HIDDEN_TEST_WINDOW_VARIABLE = "DOJO_TEST_HIDDEN_WINDOW";

/** Set to 1 by a person who wants to watch an e2e run: it overrides the hidden window. */
export const SHOW_TEST_WINDOW_VARIABLE = "DOJO_TEST_SHOW_WINDOW";

/** True when the window should stay hidden: the harness asked for it, nobody asked to watch, and this is not an installed app. */
export function isHiddenTestWindow(environment: NodeJS.ProcessEnv, isPackaged: boolean): boolean
{
	if (isPackaged) return false;

	return environment[HIDDEN_TEST_WINDOW_VARIABLE] === "1" && environment[SHOW_TEST_WINDOW_VARIABLE] !== "1";
}
