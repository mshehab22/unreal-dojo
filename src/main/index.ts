// App lifecycle and composition root: builds services, registers IPC, and opens the window.
import { app, BrowserWindow, ipcMain } from "electron";

import { createHandlers } from "./ipc/createHandlers";
import { registerHandlers } from "./ipc/registerHandlers";
import { createEngineLocator } from "./services/unreal/createEngineLocator";
import type { EngineLocator } from "./services/unreal/EngineLocator";
import { MathRandomSource } from "./services/progress/MathRandomSource";
import { NodeFileSystem } from "./services/progress/NodeFileSystem";
import { ProgressService } from "./services/progress/ProgressService";
import { ProgressStore } from "./services/progress/ProgressStore";
import { SystemClock } from "./services/progress/SystemClock";
import { createMainWindow } from "./window/createMainWindow";

/** Starts the app once Electron is ready and reopens the window when the macOS dock icon is clicked. */
async function start(): Promise<void>
{
	await app.whenReady();

	let engineLocator: EngineLocator | null = null;
	const getEngineLocator = (): EngineLocator => (engineLocator ??= createEngineLocator());
	const progressStore = new ProgressStore(new NodeFileSystem(), app.getPath("userData"));
	const progressService = await ProgressService.open(progressStore, new SystemClock(), new MathRandomSource());

	registerHandlers(ipcMain, createHandlers({ getAppVersion: () => app.getVersion(), getEngineLocator, progressService }));
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
