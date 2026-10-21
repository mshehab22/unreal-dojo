// App lifecycle and composition root: builds services, registers IPC, and opens the window.
import { app, BrowserWindow } from "electron";

import { registerHandlers } from "./ipc/registerHandlers";
import { createMainWindow } from "./window/createMainWindow";

/** Starts the app once Electron is ready and reopens the window when the macOS dock icon is clicked. */
async function start(): Promise<void>
{
	await app.whenReady();

	registerHandlers();
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
