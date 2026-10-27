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

		// The unanswered promise is kept in a list: with nothing pointing at it, the garbage collector can drop it after a while and
		// Electron then rejects the call with "reply was never sent", which hides the wait limit this stub exists to test (M5.1l).
		const unanswered: Promise<unknown>[] = [];
		let calls = 0;
		ipcMain.removeHandler(stubbedChannel);
		ipcMain.handle(stubbedChannel, (event, ...methodArguments) =>
		{
			calls += 1;

			if (calls !== 1) return original(event, ...methodArguments);

			const never = new Promise<unknown>(() => undefined);
			unanswered.push(never);

			return never;
		});
	}, channel);
}
