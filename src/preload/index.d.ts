// Tells the renderer's TypeScript that the preload bridge exists on window.
import type { DojoApi } from "../shared/ipc";

declare global
{
	/** The renderer's global window, extended with the preload bridge. */
	interface Window
	{
		/** Typed access to the main process. */
		dojo: DojoApi;
	}
}

export {};
