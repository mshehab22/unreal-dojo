// Smoke test: the built app launches, opens one window at the spec's size, and shows the title screen.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "./support/dojoTest";
import { expectedWindowSize, heightIsLimitedByScreen, measureWindowSizes, MINIMUM_WINDOW_SIZE, SCREEN_HEIGHT_SLACK, SPEC_WINDOW_SIZE } from "./support/windowSize";

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
	// When the screen sets the height, macOS fits the window to the work area of that moment, which the Dock can shrink and grow again
	// a moment later (853, then 858, on the M5 Air, A118). Then the height must be within a few points of the screen's limit, and never below 700.
	// A window that gets its full 900 is still checked exactly.
	if (heightIsLimitedByScreen(sizes.workArea))
	{
		const screenLimit = Math.min(SPEC_WINDOW_SIZE.height, sizes.workArea.height);

		expect(sizes.bounds?.height).toBeGreaterThanOrEqual(MINIMUM_WINDOW_SIZE.height);
		expect(Math.abs((sizes.bounds?.height ?? 0) - screenLimit), `height ${sizes.bounds?.height} against a screen limit of ${screenLimit}`).toBeLessThanOrEqual(SCREEN_HEIGHT_SLACK);
	}
	else
	{
		expect(sizes.bounds?.height).toBe(expectedSize.height);
	}
	expect(sizes.minimum).toEqual([MINIMUM_WINDOW_SIZE.width, MINIMUM_WINDOW_SIZE.height]);

	// The hidden macOS title bar means the window can only be moved through this strip.
	const dragRegion = window.getByTestId("title-bar-drag-region");
	await expect(dragRegion).toHaveCSS("-webkit-app-region", "drag");
	expect((await dragRegion.boundingBox())?.height).toBe(36);

	const hasNodeAccess = await window.evaluate(() => typeof (globalThis as { require?: unknown }).require !== "undefined");
	expect(hasNodeAccess).toBe(false);

	// A test launch renders in software, so a busy GPU cannot crash the run (A1470): Chromium reports GPU compositing as disabled.
	const gpuCompositing = await electronApp.evaluate(({ app }) => String((app.getGPUFeatureStatus() as unknown as Record<string, unknown>)["gpu_compositing"]));
	expect(gpuCompositing).toMatch(/^disabled/);

	await camera.capture(window, "window.png", { proofFileName: "m0-1-window.png" });
});
