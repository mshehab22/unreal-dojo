// App lifecycle and composition root: builds services, registers IPC, and opens the window.
import { randomUUID } from "node:crypto";

import { app, BrowserWindow, dialog, ipcMain } from "electron";

import { createContentCatalog } from "./content/createContentCatalog";
import { resolveContentRoot } from "./content/resolveContentRoot";
import { createHandlers } from "./ipc/createHandlers";
import { registerHandlers } from "./ipc/registerHandlers";
import { createEngineLocator } from "./services/unreal/createEngineLocator";
import type { EngineLocator } from "./services/unreal/EngineLocator";
import { MathRandomSource } from "./services/progress/MathRandomSource";
import { NodeFileSystem } from "./services/progress/NodeFileSystem";
import { ProgressContentService } from "./services/progress/ProgressContentService";
import { createTestsOnlyGraders } from "./services/progress/ProgressGraders";
import { ProgressService } from "./services/progress/ProgressService";
import { ProgressStore } from "./services/progress/ProgressStore";
import { SystemClock } from "./services/progress/SystemClock";
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
	const progressStore = new ProgressStore(new NodeFileSystem(), app.getPath("userData"));
	const progressService = await ProgressService.openOrRefuse(progressStore, new SystemClock(), new MathRandomSource());
	const refusal = progressService.getRefusal();

	const contentCatalog = createContentCatalog(resolveContentRoot({ isPackaged: app.isPackaged, resourcesPath: process.resourcesPath, appPath: app.getAppPath() }));
	contentCatalog.startLoading();

	// A refused save still lets the app open; every progress call answers the save-failed error so the renderer can show it.
	if (refusal) console.error(`Progress refused: ${refusal.message} ${refusal.detail ?? ""}`);

	// Tests-only graders stand in until the review service is wired with the settings service (A318).
	const progressContentService = new ProgressContentService(contentCatalog, progressService, createTestsOnlyGraders(), new MathRandomSource(), () => randomUUID());

	registerHandlers(ipcMain, createHandlers({ getAppVersion: () => app.getVersion(), getEngineLocator, getContentCatalog: () => contentCatalog, pickFolder, progressService, progressContentService }));
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

start().catch((error: unknown) =>
{
	console.error("Unreal Dojo failed to start", error);
});
