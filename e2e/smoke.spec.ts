// Smoke test: the built app launches, opens one window at the spec's size, and shows the title screen.
import { copyFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { _electron as electron, expect, test } from "@playwright/test";

const PROOF_PATH = resolve("docs/iterations/m0-1-window.png");
const PACKAGE_VERSION: string = JSON.parse(readFileSync(resolve("package.json"), "utf8")).version;

const SPEC_SIZE = { width: 1440, height: 900 };
const MINIMUM_SIZE = { width: 1100, height: 700 };

/** The window size the spec asks for on a screen this big: 1440x900 shrunk to the work area, but never below the 1100x700 minimum. */
function expectedWindowSize(workArea: { width: number; height: number }): { width: number; height: number }
{
	return {
		width: Math.max(MINIMUM_SIZE.width, Math.min(SPEC_SIZE.width, workArea.width)),
		height: Math.max(MINIMUM_SIZE.height, Math.min(SPEC_SIZE.height, workArea.height)),
	};
}

test("the app opens its main window", async ({}, testInfo) =>
{
	// Launching the project folder (not out/main/index.js) lets Electron read package.json, as the packaged app does.
	const electronApp = await electron.launch({ args: [resolve(".")] });
	const window = await electronApp.firstWindow();
	let passed = false;

	try
	{
		await expect(window.getByRole("heading", { name: "Unreal Dojo" })).toBeVisible();
		await expect(window.getByTestId("app-version")).toHaveText(`v${PACKAGE_VERSION}`);

		// The OS shrinks a window that does not fit the screen, but Electron keeps the minimum size even on a smaller screen.
		const sizes = await electronApp.evaluate(({ BrowserWindow, screen }) =>
		{
			const mainWindow = BrowserWindow.getAllWindows()[0];
			return { bounds: mainWindow?.getBounds(), minimum: mainWindow?.getMinimumSize(), workArea: screen.getPrimaryDisplay().workAreaSize };
		});
		const expectedSize = expectedWindowSize(sizes.workArea);

		expect(sizes.bounds?.width).toBe(expectedSize.width);
		expect(sizes.bounds?.height).toBe(expectedSize.height);
		expect(sizes.minimum).toEqual([MINIMUM_SIZE.width, MINIMUM_SIZE.height]);

		// The hidden macOS title bar means the window can only be moved through this strip.
		const dragRegion = window.getByTestId("title-bar-drag-region");
		await expect(dragRegion).toHaveCSS("-webkit-app-region", "drag");
		expect((await dragRegion.boundingBox())?.height).toBe(36);

		const hasNodeAccess = await window.evaluate(() => typeof (globalThis as { require?: unknown }).require !== "undefined");
		expect(hasNodeAccess).toBe(false);

		passed = true;
	}
	finally
	{
		// Always save a screenshot to the gitignored test-results/ folder, so a failing CI run still uploads a picture.
		// SAVE_PROOF=1 also copies it into docs/iterations/ for an iterations entry, but only when the test passed.
		const screenshotPath = testInfo.outputPath("window.png");
		const saved = await window.screenshot({ path: screenshotPath }).then(() => true, () => false);

		if (saved && passed && process.env["SAVE_PROOF"] === "1") copyFileSync(screenshotPath, PROOF_PATH);

		await electronApp.close();
	}
});
