// The typed contract between the renderer and the main process. M0.2 fills in every method from the system specs.

/** Everything the renderer can ask the main process to do, exposed as `window.dojo`. */
export interface DojoApi
{
	/** Returns the app version from package.json, used by the frame's footer and by the smoke test. */
	getAppVersion(): Promise<string>;
}

/** Name of every IPC channel, derived from the DojoApi method names so the two can never drift apart. */
export const IPC_CHANNELS = {
	getAppVersion: "dojo:getAppVersion",
} as const satisfies Record<keyof DojoApi, string>;
