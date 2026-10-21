// The only bridge between the sandboxed renderer and the main process. Exposes narrow functions, never ipcRenderer itself.
import { contextBridge, ipcRenderer } from "electron";

import { IPC_CHANNELS, type DojoApi } from "@shared/ipc";

const dojo: DojoApi = {
	getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.getAppVersion),
};

contextBridge.exposeInMainWorld("dojo", dojo);
