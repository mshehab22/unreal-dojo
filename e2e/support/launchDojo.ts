// Launches the built app the way the packaged app starts, with its own empty settings folder, and cleans up after it.
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { _electron as electron, type ElectronApplication, type Page } from "@playwright/test";

import { backgroundElectronExecutable } from "./backgroundElectron";

/** One running copy of the app under test. */
export interface DojoSession
{
	electronApp: ElectronApplication;

	/** The first window the app opened. */
	window: Page;

	/** The throwaway folder Electron uses as `userData` for this launch. */
	userDataFolder: string;

	/** Everything main wrote to stdout and stderr from when the window opens, so a failing test can attach it (W12). */
	mainLog: string[];
}

/** The start of the line main writes when the content load took 2 s or more. */
const SLOW_CONTENT_LOAD_MARKER = "[content] slow load";

/** Marks main's IPC lines in the runner's console, so they are easy to find in a CI job log. */
const MAIN_IPC_LINE_PREFIX = "[dojo main]";

/**
 * Collects main's stdout and stderr lines from when the window opens, each prefixed with the time it arrived. Every `[ipc]` line (a slow
 * call, a failed handler) and every `[content] slow load` line is also printed to the runner's console as it arrives, so it is in the CI job
 * log even when the test passes (A1252, A1260).
 */
function collectMainLog(electronApp: ElectronApplication): string[]
{
	const lines: string[] = [];

	// Returns the listener for one stream; a chunk can hold several lines or part of one.
	const collect = (stream: string) => (chunk: Buffer | string) =>
	{
		for (const line of chunk.toString().split(/\r?\n/))
		{
			if (line.trim().length === 0) continue;

			const stampedLine = `${new Date().toISOString()} ${stream} ${line}`;
			lines.push(stampedLine);

			if (line.includes("[ipc]") || line.includes(SLOW_CONTENT_LOAD_MARKER)) console.log(`${MAIN_IPC_LINE_PREFIX} ${stampedLine}`);
		}
	};

	electronApp.process().stdout?.on("data", collect("out"));
	electronApp.process().stderr?.on("data", collect("err"));

	return lines;
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
		// DOJO_TEST_HIDDEN_WINDOW keeps the window off screen and out of focus (A970); run with DOJO_TEST_SHOW_WINDOW=1 to watch it.
		// On macOS a background copy of Electron.app keeps the launch itself off the desktop (A973).
		const executablePath = backgroundElectronExecutable(process.env["DOJO_TEST_SHOW_WINDOW"] === "1");
		electronApp = await electron.launch({
			args: [resolve("."), `--user-data-dir=${userDataFolder}`],
			env: { ...process.env, DOJO_TEST_HIDDEN_WINDOW: "1" },
			...(executablePath === undefined ? {} : { executablePath }),
		});
		const mainLog = collectMainLog(electronApp);
		const window = await electronApp.firstWindow();

		await window.waitForLoadState("domcontentloaded");

		return { electronApp, window, userDataFolder, mainLog };
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
