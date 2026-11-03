// Decides what an e2e launch changes: a hidden window, so test runs never take over the screen (A970), and software rendering, so a busy GPU cannot crash them (A1470).

/** Set to 1 by the e2e harness: the window renders off screen, never takes focus, and the macOS Dock icon stays hidden. */
export const HIDDEN_TEST_WINDOW_VARIABLE = "DOJO_TEST_HIDDEN_WINDOW";

/** Set to 1 by a person who wants to watch an e2e run: it overrides the hidden window. */
export const SHOW_TEST_WINDOW_VARIABLE = "DOJO_TEST_SHOW_WINDOW";

/**
 * True when the e2e harness launched this copy (it sets the hidden-window variable on every launch, even when someone watches with the show variable).
 * Such a launch renders without the GPU: under load the GPU process exited (0xC0000409) and every later screenshot failed (A1470). Never true for an installed app.
 */
export function isTestLaunch(environment: NodeJS.ProcessEnv, isPackaged: boolean): boolean
{
	return !isPackaged && environment[HIDDEN_TEST_WINDOW_VARIABLE] === "1";
}

/** True when the window should stay hidden: the harness asked for it, nobody asked to watch, and this is not an installed app. */
export function isHiddenTestWindow(environment: NodeJS.ProcessEnv, isPackaged: boolean): boolean
{
	if (isPackaged) return false;

	return environment[HIDDEN_TEST_WINDOW_VARIABLE] === "1" && environment[SHOW_TEST_WINDOW_VARIABLE] !== "1";
}
