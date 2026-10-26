// A copy of Electron.app marked as a background app, so a macOS e2e launch never shows up as a regular app, not even before the app's own code runs (A973).
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const ELECTRON_APP = resolve("node_modules/electron/dist/Electron.app");
const CACHE_FOLDER = resolve("node_modules/.cache/dojo-e2e");

/**
 * The Electron executable for a hidden e2e launch: on macOS a cached copy of Electron.app with `LSUIElement` set, which starts as a background app
 * instead of spending its first tenth of a second as a regular one. Undefined (Playwright's default Electron) on other platforms or when the run should show its window.
 */
export function backgroundElectronExecutable(showWindow: boolean): string | undefined
{
	if (process.platform !== "darwin" || showWindow) return undefined;

	const version = JSON.parse(readFileSync(resolve("node_modules/electron/package.json"), "utf8")).version as string;
	const copiedApp = join(CACHE_FOLDER, `electron-${version}`, "Electron.app");
	const executable = join(copiedApp, "Contents", "MacOS", "Electron");

	if (existsSync(executable)) return executable;

	// Built in a temporary folder and renamed into place, so an interrupted copy is never mistaken for a finished one.
	const buildingFolder = join(CACHE_FOLDER, `electron-${version}-building-${process.pid}`);
	rmSync(buildingFolder, { recursive: true, force: true });
	mkdirSync(buildingFolder, { recursive: true });

	const buildingApp = join(buildingFolder, "Electron.app");
	cpSync(ELECTRON_APP, buildingApp, { recursive: true, verbatimSymlinks: true });

	// Electron's ad-hoc signature does not seal Info.plist, so the edit needs no re-signing.
	execFileSync("/usr/libexec/PlistBuddy", ["-c", "Add :LSUIElement bool true", join(buildingApp, "Contents", "Info.plist")]);

	mkdirSync(join(copiedApp, ".."), { recursive: true });
	renameSync(buildingApp, copiedApp);
	rmSync(buildingFolder, { recursive: true, force: true });

	return executable;
}
