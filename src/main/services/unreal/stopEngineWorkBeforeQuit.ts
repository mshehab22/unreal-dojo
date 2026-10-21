// One quit sequence for everything Unreal: cancel running builds and tests, then close the editor, then let the app quit (A530).
import type { EditorLauncher } from "./EditorLauncher";

/** How long quitting waits for cancelled builds and test runs to end. Killing a process tree takes well under a second. */
export const QUIT_RUN_WAIT_MS = 5000;

/** The part of Electron's `app` this needs, so tests pass a fake. */
export interface QuittingApp
{
	on(eventName: "before-quit", listener: (event: { preventDefault(): void }) => void): void;
	quit(): void;
}

/** The part of RunRegistry this needs. */
export interface CancellableRuns
{
	hasRuns(): boolean;
	cancelAll(waitMs: number): Promise<void>;
}

/** What the sequence stops. The launcher is a function because the Unreal services are built lazily; null when they were never built (so no editor was opened). */
export interface EngineWork
{
	runs: CancellableRuns;
	editorLauncher: () => EditorLauncher | null;
}

/**
 * On the first `before-quit` with runs or an open editor: holds the quit, cancels the runs (up to 5 s), disposes the launcher (exit request, kill after 15 s), then quits again.
 * Every quit attempt meanwhile is held too. The launcher is always disposed, so the background reopen after a full build cannot start an editor once quit began.
 */
export function stopEngineWorkBeforeQuit(app: QuittingApp, work: EngineWork): void
{
	let state: "running" | "stopping" | "stopped" = "running";

	app.on("before-quit", (event) =>
	{
		if (state === "stopped") return;

		if (state === "stopping")
		{
			event.preventDefault();
			return;
		}

		const launcher = work.editorLauncher();

		if (!work.runs.hasRuns() && (launcher === null || launcher.current() === null))
		{
			state = "stopped";
			void launcher?.dispose();
			return;
		}

		state = "stopping";
		event.preventDefault();

		void stopAll(work, launcher).finally(() =>
		{
			state = "stopped";
			app.quit();
		});
	});
}

/** Cancels runs first (a run may be using the editor), then disposes the launcher. Neither step's failure stops the other. */
async function stopAll(work: EngineWork, launcher: EditorLauncher | null): Promise<void>
{
	if (work.runs.hasRuns()) await work.runs.cancelAll(QUIT_RUN_WAIT_MS).catch(() => undefined);

	await launcher?.dispose().catch(() => undefined);
}
