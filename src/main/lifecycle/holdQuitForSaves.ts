// Lets the learner's last change reach the disk before the app quits, waiting at most a few seconds.
import type { QuittingApp } from "../services/unreal/stopEngineWorkBeforeQuit";

/** How long quitting waits for pending saves. A stuck disk must never freeze the quit (A1211). */
export const QUIT_SAVE_WAIT_MS = 3000;

/** The part of ProgressService this needs. */
export interface SaveQueue
{
	whenIdle(timeoutMs: number): Promise<boolean>;
}

/** On the first `before-quit`, holds the quit until the save queue is idle (or the wait ends), then quits again. Holds only once and never loops. */
export function holdQuitForSaves(app: QuittingApp, saves: SaveQueue, waitMs: number = QUIT_SAVE_WAIT_MS): void
{
	let state: "running" | "waiting" | "done" = "running";

	app.on("before-quit", (event) =>
	{
		if (state === "done") return;

		event.preventDefault();

		if (state === "waiting") return;

		state = "waiting";

		void saves
			.whenIdle(waitMs)
			.catch(() => false)
			.finally(() =>
			{
				state = "done";
				app.quit();
			});
	});
}
