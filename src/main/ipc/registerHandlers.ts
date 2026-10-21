// Connects every DojoApi channel to the main-process code that answers it.
import { app, ipcMain } from "electron";

import { IPC_CHANNELS } from "@shared/ipc";

/** Registers one ipcMain handler per DojoApi method. Called once from the composition root. */
export function registerHandlers(): void
{
	ipcMain.handle(IPC_CHANNELS.getAppVersion, () => app.getVersion());
}
