// Launches the built app the way the packaged app starts, with its own empty settings folder, and cleans up after it.
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { _electron as electron, type ElectronApplication, type Page } from "@playwright/test";

/** One running copy of the app under test. */
export interface DojoSession
{
	electronApp: ElectronApplication;

	/** The first window the app opened. */
	window: Page;

	/** The throwaway folder Electron uses as `userData` for this launch. */
	userDataFolder: string;
}

/**
 * Starts the app from `out/` (run `npm run build` first) and waits for its first window. With no folder it makes a fresh temporary userData folder;
 * given the folder of an earlier session (closed with `closeDojoKeepingData`), it relaunches on the same data, as a learner restarting the app does.
 */
export async function launchDojo(existingUserDataFolder?: string): Promise<DojoSession>
{
	// realpath because the macOS temp folder is a symlink (/var to /private/var) and Electron reports the resolved path.
	const userDataFolder = existingUserDataFolder ?? realpathSync(mkdtempSync(join(tmpdir(), "dojo-e2e-")));

	// Launching the project folder (not out/main/index.js) lets Electron read package.json, as the packaged app does.
	// `--user-data-dir` points app.getPath("userData") at the temp folder, so no test sees another test's settings or the learner's real ones.
	let electronApp: ElectronApplication | undefined;

	try
	{
		electronApp = await electron.launch({ args: [resolve("."), `--user-data-dir=${userDataFolder}`] });
		const window = await electronApp.firstWindow();

		await window.waitForLoadState("domcontentloaded");

		return { electronApp, window, userDataFolder };
	}
	catch (error)
	{
		// A launch that fails (no build, or the window never opens) must not leave a running app or a temp folder behind.
		await electronApp?.close().catch(() => undefined);
		if (existingUserDataFolder === undefined) rmSync(userDataFolder, { recursive: true, force: true });
		throw error;
	}
}

/** Closes the app and deletes its temporary userData folder. */
export async function closeDojo(session: DojoSession): Promise<void>
{
	await session.electronApp.close();
	rmSync(session.userDataFolder, { recursive: true, force: true });
}

/** Closes the app but keeps its userData folder, so `launchDojo(folder)` can start it again on the same data. The caller deletes the folder later. */
export async function closeDojoKeepingData(session: DojoSession): Promise<void>
{
	await session.electronApp.close();
}
