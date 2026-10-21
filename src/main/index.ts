// App lifecycle and composition root: builds services, registers IPC, and opens the window.
import { app, BrowserWindow, dialog, ipcMain } from "electron";

import { createContentCatalog } from "./content/createContentCatalog";
import { resolveContentRoot } from "./content/resolveContentRoot";
import { createHandlers } from "./ipc/createHandlers";
import { registerHandlers } from "./ipc/registerHandlers";
import { createEngineLocator } from "./services/unreal/createEngineLocator";
import type { EngineLocator } from "./services/unreal/EngineLocator";
import { createMainWindow } from "./window/createMainWindow";

/** Opens the native folder picker over the focused window. Resolves null when the learner cancels. */
async function pickFolder(title: string): Promise<string | null>
{
	const options: Electron.OpenDialogOptions = { title, properties: ["openDirectory"] };
	const parentWindow = BrowserWindow.getFocusedWindow();
	const result = parentWindow ? await dialog.showOpenDialog(parentWindow, options) : await dialog.showOpenDialog(options);

	return result.canceled ? null : (result.filePaths[0] ?? null);
}

/** Starts the app once Electron is ready and reopens the window when the macOS dock icon is clicked. */
async function start(): Promise<void>
{
	await app.whenReady();

	let engineLocator: EngineLocator | null = null;
	const getEngineLocator = (): EngineLocator => (engineLocator ??= createEngineLocator());

	const contentCatalog = createContentCatalog(resolveContentRoot({ isPackaged: app.isPackaged, resourcesPath: process.resourcesPath, appPath: app.getAppPath() }));
	contentCatalog.startLoading();

	registerHandlers(ipcMain, createHandlers({ getAppVersion: () => app.getVersion(), getEngineLocator, getContentCatalog: () => contentCatalog, pickFolder }));
	createMainWindow();

	app.on("activate", () =>
	{
		if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
	});
}

app.on("window-all-closed", () =>
{
	if (process.platform !== "darwin") app.quit();
});

void start();
