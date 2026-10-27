// Tells the learner in plain English that the app could not start, keeps the technical detail in the log, and quits.

/** The title of the dialog. */
export const STARTUP_FAILURE_TITLE = "Unreal Dojo could not start";

/** The dialog text: what happened and what to do, with no stack trace. */
export const STARTUP_FAILURE_TEXT = "Something went wrong while Unreal Dojo was starting, so it has to close. Please open it again. If this keeps happening, restart your computer or reinstall the app.";

/** What the failure screen needs from Electron and the console, so tests pass fakes. */
export interface StartupFailureDependencies
{
	/** Writes the technical detail where a developer can find it. */
	log: (message: string, error: unknown) => void;

	/** Shows the native error box (Electron's `dialog.showErrorBox`). */
	showErrorBox: (title: string, content: string) => void;

	/** Quits the app. */
	quit: () => void;
}

/** Logs the error, shows the plain dialog, then quits. Quits even when the dialog itself fails (that failure is logged too). */
export function showStartupFailure(error: unknown, dependencies: StartupFailureDependencies): void
{
	dependencies.log("Unreal Dojo failed to start", error);

	try
	{
		dependencies.showErrorBox(STARTUP_FAILURE_TITLE, STARTUP_FAILURE_TEXT);
	}
	catch (dialogFailure)
	{
		dependencies.log("The startup failure dialog could not be shown", dialogFailure);
	}

	dependencies.quit();
}
