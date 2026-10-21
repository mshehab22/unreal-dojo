// Smoke test: the built app launches, opens one window at the spec's size, and shows the title screen.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "./support/dojoTest";
import { expectedWindowSize, measureWindowSizes, MINIMUM_WINDOW_SIZE } from "./support/windowSize";

const PACKAGE_VERSION: string = JSON.parse(readFileSync(resolve("package.json"), "utf8")).version;

test("the app opens its main window", async ({ dojo, camera }) =>
{
	const { electronApp, window } = dojo;

	await expect(window.getByRole("heading", { name: "Unreal Dojo" })).toBeVisible();
	await expect(window.getByTestId("app-version")).toHaveText(`v${PACKAGE_VERSION}`);

	// The OS shrinks a window that does not fit the screen, but Electron keeps the minimum size even on a smaller screen.
	const sizes = await measureWindowSizes(electronApp);
	const expectedSize = expectedWindowSize(sizes.workArea);

	expect(sizes.bounds?.width).toBe(expectedSize.width);
	expect(sizes.bounds?.height).toBe(expectedSize.height);
	expect(sizes.minimum).toEqual([MINIMUM_WINDOW_SIZE.width, MINIMUM_WINDOW_SIZE.height]);

	// The hidden macOS title bar means the window can only be moved through this strip.
	const dragRegion = window.getByTestId("title-bar-drag-region");
	await expect(dragRegion).toHaveCSS("-webkit-app-region", "drag");
	expect((await dragRegion.boundingBox())?.height).toBe(36);

	const hasNodeAccess = await window.evaluate(() => typeof (globalThis as { require?: unknown }).require !== "undefined");
	expect(hasNodeAccess).toBe(false);

	await camera.capture(window, "window.png", "m0-1-window.png");
});
