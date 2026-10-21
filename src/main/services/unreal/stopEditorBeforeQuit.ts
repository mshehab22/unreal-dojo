// Closes the app's Unreal editor before Electron quits, so no editor is left running and none is reopened during quit.
import type { EditorLauncher } from "./EditorLauncher";

/** The part of Electron's `app` this needs, so tests pass a fake. */
export interface QuittingApp
{
	on(eventName: "before-quit", listener: (event: { preventDefault(): void }) => void): void;
	quit(): void;
}

/** On the first `before-quit` while an editor is open: holds the quit, disposes the launcher (exit request, kill after 15 s), then quits again. Holds every other quit attempt until that is done (another before-quit listener may call quit sooner). Always marks the launcher disposed, so a background reopen cannot start an editor during quit. */
export function stopEditorBeforeQuit(app: QuittingApp, editorLauncher: EditorLauncher): void
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

		if (editorLauncher.current() === null)
		{
			state = "stopped";
			void editorLauncher.dispose();
			return;
		}

		state = "stopping";
		event.preventDefault();

		void editorLauncher.dispose().finally(() =>
		{
			state = "stopped";
			app.quit();
		});
	});
}
