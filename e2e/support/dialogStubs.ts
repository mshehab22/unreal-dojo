// Replaces Electron's native dialogs inside the running app, because Playwright cannot click a real OS dialog.
import type { ElectronApplication } from "@playwright/test";

/** Makes every open dialog (folder or file picker) answer with `pickedPath`, or as cancelled when it is null. Lasts until the app closes. */
export async function stubOpenDialog(electronApp: ElectronApplication, pickedPath: string | null): Promise<void>
{
	await electronApp.evaluate(({ dialog }, path) =>
	{
		const filePaths = path === null ? [] : [path];

		Object.assign(dialog, {
			showOpenDialog: async () => ({ canceled: path === null, filePaths }),
			showOpenDialogSync: () => (path === null ? undefined : filePaths),
		});
	}, pickedPath);
}

/** Makes every message box answer as if the button at `buttonIndex` was clicked, with any checkbox left unticked. */
export async function stubMessageBox(electronApp: ElectronApplication, buttonIndex: number): Promise<void>
{
	await electronApp.evaluate(({ dialog }, response) =>
	{
		Object.assign(dialog, {
			showMessageBox: async () => ({ response, checkboxChecked: false }),
			showMessageBoxSync: () => response,
		});
	}, buttonIndex);
}
