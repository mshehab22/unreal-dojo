// Brings the window back once when its page process dies; a second crash is left alone so a broken page never reloads in a loop.

/** What the crash handler needs from a window's web contents, so tests pass a fake. */
export interface CrashableContents
{
	on(eventName: "render-process-gone", listener: (event: unknown, details: { reason: string }) => void): void;
	reload(): void;
	isDestroyed(): boolean;
}

/** Reloads the page the first time its process is gone for any reason other than a clean exit. Later crashes are only logged, and a destroyed window is left alone. */
export function reloadOnceOnRendererCrash(contents: CrashableContents, log: (message: string) => void): void
{
	let reloaded = false;

	contents.on("render-process-gone", (_event, details) =>
	{
		if (details.reason === "clean-exit") return;
		if (contents.isDestroyed()) return;

		if (reloaded)
		{
			log(`The window crashed again (${details.reason}); not reloading a second time.`);
			return;
		}

		reloaded = true;
		log(`The window crashed (${details.reason}); reloading it once.`);
		contents.reload();
	});
}
