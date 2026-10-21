// Pushes build progress events from main-process services to every open window.
import { BrowserWindow } from "electron";

import { BUILD_PROGRESS_CHANNEL } from "@shared/ipc";
import type { BuildProgressEvent } from "@shared/types/run";

/** Sends one progress event on the build progress channel to every window that is still open. Services receive this as their `onProgress`. */
export function sendBuildProgress(event: BuildProgressEvent): void
{
	for (const window of BrowserWindow.getAllWindows())
	{
		if (!window.isDestroyed()) window.webContents.send(BUILD_PROGRESS_CHANNEL, event);
	}
}
