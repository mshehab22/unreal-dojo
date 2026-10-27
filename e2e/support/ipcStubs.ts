// Replaces one IPC handler inside the running app, so a test can make main misbehave on a single call (W12).
import type { ElectronApplication } from "@playwright/test";

/**
 * Makes main's first answer on `channel` never come; every later call goes to the real handler. Lasts until the app closes.
 * `_invokeHandlers` is Electron's own table of `ipcMain.handle` listeners; this throws if Electron ever moves it.
 */
export async function stubFirstAnswerNeverComes(electronApp: ElectronApplication, channel: string): Promise<void>
{
	await electronApp.evaluate(({ ipcMain }, stubbedChannel) =>
	{
		type InvokeHandler = (event: unknown, ...methodArguments: unknown[]) => unknown;
		const original = (ipcMain as unknown as { _invokeHandlers?: Map<string, InvokeHandler> })._invokeHandlers?.get(stubbedChannel);

		if (!original) throw new Error(`no ipcMain handler found on ${stubbedChannel}`);

		let calls = 0;
		ipcMain.removeHandler(stubbedChannel);
		ipcMain.handle(stubbedChannel, (event, ...methodArguments) =>
		{
			calls += 1;

			return calls === 1 ? new Promise(() => undefined) : original(event, ...methodArguments);
		});
	}, channel);
}
