// Lets the learner's last change reach the disk before the app quits, waiting at most a few seconds before each quit attempt.
import type { QuittingApp } from "./QuittingApp";

/** How long quitting waits for pending saves, per quit attempt. A stuck disk must never freeze the quit (A1211). */
export const QUIT_SAVE_WAIT_MS = 3000;

/** The part of ProgressService this needs. */
export interface SaveQueue
{
	whenIdle(timeoutMs: number): Promise<boolean>;
}

/** Runs a function on a later turn of the event loop (Node's `setImmediate`). */
export type Defer = (action: () => void) => void;

/** The real deferral: after the current event handling has fully returned. */
const deferToNextTurn: Defer = (action) =>
{
	setImmediate(action);
};

/**
 * Holds every quit attempt until the save queue is idle (or the wait ends), then quits again; the quit it starts itself is let through.
 * Another quit step (the Unreal stop, A530) may hold that quit and quit again later: that later attempt waits for saves once more, so a change
 * made while the window stayed open during the stop is saved too (A1460). Attempts made while a wait runs add no second wait.
 * The quit is deferred to a later turn so it never runs inside the attempt's own event, which on macOS can leave the app running (A1211).
 */
export function holdQuitForSaves(app: QuittingApp, saves: SaveQueue, waitMs: number = QUIT_SAVE_WAIT_MS, defer: Defer = deferToNextTurn): void
{
	let state: "holding" | "waiting" | "releasing" = "holding";

	app.on("before-quit", (event) =>
	{
		// The quit this helper started after a wait: let it through. If another step holds it, the next attempt is held again.
		if (state === "releasing")
		{
			state = "holding";
			return;
		}

		event.preventDefault();

		if (state === "waiting") return;

		state = "waiting";

		void saves
			.whenIdle(waitMs)
			.catch(() => false)
			.finally(() =>
			{
				defer(() =>
				{
					state = "releasing";
					app.quit();
				});
			});
	});
}
