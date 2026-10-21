// Smoke test: the built app launches, opens one window at the spec's size, and shows the title screen.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { _electron as electron, expect, test } from "@playwright/test";

const SCREENSHOT_PATH = resolve("docs/iterations/m0-1-window.png");
const PACKAGE_VERSION: string = JSON.parse(readFileSync(resolve("package.json"), "utf8")).version;

test("the app opens its main window", async () =>
{
	// Launching the project folder (not out/main/index.js) lets Electron read package.json, as the packaged app does.
	const electronApp = await electron.launch({ args: [resolve(".")] });
	const window = await electronApp.firstWindow();

	await expect(window.getByRole("heading", { name: "Unreal Dojo" })).toBeVisible();
	await expect(window.getByTestId("app-version")).toHaveText(`v${PACKAGE_VERSION}`);

	// The OS shrinks a window that does not fit the screen, so the expected size is 1440x900 capped by the work area.
	const sizes = await electronApp.evaluate(({ BrowserWindow, screen }) =>
	{
		const mainWindow = BrowserWindow.getAllWindows()[0];
		return { bounds: mainWindow?.getBounds(), minimum: mainWindow?.getMinimumSize(), workArea: screen.getPrimaryDisplay().workAreaSize };
	});

	expect(sizes.bounds?.width).toBe(Math.min(1440, sizes.workArea.width));
	expect(sizes.bounds?.height).toBe(Math.min(900, sizes.workArea.height));
	expect(sizes.minimum).toEqual([1100, 700]);

	const hasNodeAccess = await window.evaluate(() => typeof (globalThis as { require?: unknown }).require !== "undefined");
	expect(hasNodeAccess).toBe(false);

	await window.screenshot({ path: SCREENSHOT_PATH });
	await electronApp.close();
});
