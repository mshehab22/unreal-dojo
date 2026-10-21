// The only bridge between the sandboxed renderer and the main process. Exposes narrow functions, never ipcRenderer itself.
import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";

import { BUILD_PROGRESS_CHANNEL, DOJO_METHODS, IPC_CHANNELS, type DojoApi, type DojoInvokeApi, type IpcResponse, type Unsubscribe } from "@shared/ipc";
import type { AppError } from "@shared/types/errors";
import type { BuildProgressEvent } from "@shared/types/run";

/** Builds the error for a call that never reached a handler (no handler registered, or the IPC itself failed). */
function ipcFailed(channel: string, thrown: unknown): AppError
{
	return {
		code: "ipc-failed",
		message: "The window could not reach the main process.",
		suggestedAction: "Restart Unreal Dojo. If it keeps happening, report it with the details.",
		detail: `${channel}: ${thrown instanceof Error ? thrown.message : String(thrown)}`,
	};
}

/** Sends one request and unwraps the IpcResponse: resolves with the value or rejects with a plain AppError object. */
async function invokeChannel(channel: string, methodArguments: unknown[]): Promise<unknown>
{
	let response: IpcResponse<unknown>;

	try
	{
		response = await ipcRenderer.invoke(channel, ...methodArguments);
	}
	catch (thrown)
	{
		throw ipcFailed(channel, thrown);
	}

	if (response.ok) return response.value;

	throw response.error;
}

/** Builds one forwarding function per DojoApi method from the channel map, so a new method needs no preload change. */
function createInvokeApi(): DojoInvokeApi
{
	const invokeApi: Record<string, (...methodArguments: unknown[]) => Promise<unknown>> = {};

	for (const method of DOJO_METHODS)
	{
		const channel = IPC_CHANNELS[method];
		invokeApi[method] = (...methodArguments) => invokeChannel(channel, methodArguments);
	}

	// Every key of DojoInvokeApi was filled from DOJO_METHODS above, each forwarding to its own channel.
	return invokeApi as unknown as DojoInvokeApi;
}

/** Subscribes a renderer listener to build progress events and returns the function that removes it. Calling that function again does nothing. */
function onBuildProgress(listener: (event: BuildProgressEvent) => void): Unsubscribe
{
	const forward = (_ipcEvent: IpcRendererEvent, progressEvent: BuildProgressEvent) => listener(progressEvent);
	let subscribed = true;

	ipcRenderer.on(BUILD_PROGRESS_CHANNEL, forward);

	return () =>
	{
		if (!subscribed) return;

		subscribed = false;
		ipcRenderer.removeListener(BUILD_PROGRESS_CHANNEL, forward);
	};
}

/** Main adds this argument to packaged windows only (createMainWindow). Sandboxed preloads can read process.argv. */
const PACKAGED_FLAG = "--dojo-packaged";

/** True when main said this is a packaged build. */
function isPackaged(): boolean
{
	return process.argv.includes(PACKAGED_FLAG);
}

const dojo: DojoApi = { ...createInvokeApi(), onBuildProgress, isPackaged };

contextBridge.exposeInMainWorld("dojo", dojo);
