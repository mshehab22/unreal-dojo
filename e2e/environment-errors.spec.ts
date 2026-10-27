// ui-core M5.1i: environment errors explained on Title, First-run, and Settings (engine gone, build tools missing, sandbox setup failing with a reason, a blocked sandbox folder),
// and the friendly view when a screen throws while rendering, with the rail still working. Each at 1100x700 and 1440x900 with no sideways scroll.
// Page scripts are passed as strings because e2e is typechecked without the DOM library.
// Saves screenshots to test-results/; with SAVE_PROOF=1 the 1440x900 ones are also written to docs/iterations/m5-1i-*.jpg.
import type { Page } from "@playwright/test";

import { expect, test } from "./support/dojoTest";
import type { ProofCamera } from "./support/ProofCamera";

/** The two sizes every screen must work at (docs/systems/ui-core.md). */
const SIZES = [
	{ width: 1100, height: 700 },
	{ width: 1440, height: 900 },
] as const;

/** The words the engine-missing scenario shows. */
const ENGINE_MESSAGE = "The Unreal Engine folder is gone";
const ENGINE_ACTION = "Pick the engine folder again in Settings";

/** The words the toolchain-missing scenario shows (the same on both platforms for the part checked here). */
const TOOLCHAIN_MESSAGE = "so Unreal cannot compile C++";

/** Forces the page to render at an exact size, independent of how large the OS lets the window be (A90). */
async function setViewport(window: Page, width: number, height: number): Promise<void>
{
	const session = await window.context().newCDPSession(window);

	await session.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
}

/** Switches the data source ("fake:<scenario>") and reloads, which also resets the fake's state. */
async function useDataSource(window: Page, value: string, hash = "#/"): Promise<void>
{
	await window.evaluate(`localStorage.setItem("dojo.dataSource", ${JSON.stringify(value)}); location.hash = ${JSON.stringify(hash)}`);
	await window.reload();
	await window.waitForLoadState("domcontentloaded");
}

/** Moves the app to a route hash and waits for its screen, its data (and the given element, when named), and fonts. */
async function goTo(window: Page, hash: string, testId: string, ready?: string): Promise<void>
{
	await window.evaluate(`location.hash = ${JSON.stringify(hash)}`);
	await expect(window.getByTestId(testId)).toBeVisible();
	await expect(window.getByTestId(testId).getByTestId("loading")).toHaveCount(0);

	if (ready) await expect(window.getByTestId(ready).first()).toBeVisible();

	await window.evaluate("document.fonts.ready.then(() => true)");
}

/** Fails when the stage scrolls sideways. */
async function expectNoSidewaysScroll(window: Page, label: string): Promise<void>
{
	const overflows = await window.evaluate<boolean>("(() => { const stage = document.querySelector('main'); return stage ? stage.scrollWidth > stage.clientWidth : true; })()");

	expect(overflows, label).toBe(false);
}

/** Screenshots into test-results/; the 1440x900 pictures are also proof pictures (JPG) when the test passes with SAVE_PROOF=1. */
async function screenshot(camera: ProofCamera, window: Page, name: string, width: number): Promise<void>
{
	if (width < 1440)
	{
		await window.screenshot({ path: test.info().outputPath(`m5-1i-${name}-${width}.png`) });
		return;
	}

	await camera.capture(window, `m5-1i-${name}.png`, { proofFileName: `m5-1i-${name}.jpg`, proofFormat: "jpeg" });
}

// Each test gets a fresh app and userData folder, so the data-source choice in localStorage never leaks into the next test.
test.beforeEach(async ({ dojo }) =>
{
	// Reduced motion zeroes every duration token, so screenshots never catch a transition halfway.
	await dojo.window.emulateMedia({ reducedMotion: "reduce" });
});

test("a missing engine is explained on Title, First-run, and Settings, and picking another engine clears it", async ({ dojo, camera }) =>
{
	const { window } = dojo;

	await useDataSource(window, "fake:engine-missing");

	for (const size of SIZES)
	{
		await setViewport(window, size.width, size.height);
		const label = `at ${size.width}x${size.height}`;

		await goTo(window, "#/", "screen-title", "environment-chips");
		await expect(window.getByTestId("chip-engine")).toContainText("Missing");
		await expect(window.getByTestId("chip-engine")).toHaveAttribute("data-tone", "fail");
		await expect(window.getByTestId("chip-engine")).toHaveAttribute("title", new RegExp(ENGINE_MESSAGE));
		await expect(window.getByTestId("environment-problems")).toContainText(ENGINE_MESSAGE);
		await expect(window.getByTestId("environment-problems")).toContainText(ENGINE_ACTION);
		await expectNoSidewaysScroll(window, `title ${label}`);
		await screenshot(camera, window, "title-engine-missing", size.width);

		await goTo(window, "#/settings", "screen-settings", "review-providers");
		await expect(window.getByTestId("settings-engine")).toContainText(ENGINE_MESSAGE);
		await expect(window.getByTestId("settings-engine")).toContainText(ENGINE_ACTION);
		await expectNoSidewaysScroll(window, `settings ${label}`);
		await screenshot(camera, window, "settings-engine-missing", size.width);

		await goTo(window, "#/first-run", "screen-firstRun", "first-run-engine");
		await expect(window.getByTestId("first-run-engine-problem")).toContainText(ENGINE_MESSAGE);
		await expect(window.getByTestId("first-run-engine-problem")).toContainText(ENGINE_ACTION);
		await expectNoSidewaysScroll(window, `first-run ${label}`);
		await screenshot(camera, window, "first-run-engine-missing", size.width);
	}

	await goTo(window, "#/settings", "screen-settings", "review-providers");
	await window.getByRole("button", { name: "Pick another engine" }).click();
	await expect(window.getByTestId("settings-engine")).not.toContainText(ENGINE_MESSAGE);

	await goTo(window, "#/", "screen-title", "environment-chips");
	await expect(window.getByTestId("chip-engine")).toContainText("UE 5.7.2");
	await expect(window.getByTestId("environment-problems")).toHaveCount(0);
});

test("missing build tools are explained on Title, First-run, and Settings", async ({ dojo, camera }) =>
{
	const { window } = dojo;

	await useDataSource(window, "fake:toolchain-missing");

	for (const size of SIZES)
	{
		await setViewport(window, size.width, size.height);
		const label = `at ${size.width}x${size.height}`;

		await goTo(window, "#/", "screen-title", "environment-chips");
		await expect(window.getByTestId("chip-toolchain")).toContainText("Blocked");
		await expect(window.getByTestId("chip-toolchain")).toHaveAttribute("data-tone", "fail");
		await expect(window.getByTestId("environment-problems")).toContainText(TOOLCHAIN_MESSAGE);
		await expect(window.getByTestId("environment-problems").getByTestId("app-error")).toHaveAttribute("data-error-code", "toolchain-missing");
		await expectNoSidewaysScroll(window, `title ${label}`);
		await screenshot(camera, window, "title-toolchain-missing", size.width);

		await goTo(window, "#/settings", "screen-settings", "review-providers");
		await expect(window.getByTestId("settings-toolchain")).toContainText("Blocked");
		await expect(window.getByTestId("settings-toolchain")).toContainText(TOOLCHAIN_MESSAGE);
		await expectNoSidewaysScroll(window, `settings ${label}`);
		await screenshot(camera, window, "settings-toolchain-missing", size.width);

		await goTo(window, "#/first-run", "screen-firstRun", "first-run-engine");
		await expect(window.getByTestId("first-run-engine")).toContainText(TOOLCHAIN_MESSAGE);
		await expect(window.getByRole("button", { name: "Use this engine" })).toBeDisabled();
		await expectNoSidewaysScroll(window, `first-run ${label}`);
		await screenshot(camera, window, "first-run-toolchain-missing", size.width);
	}
});

test("a sandbox setup that fails shows the reason the main process gave, not a guess", async ({ dojo, camera }) =>
{
	const { window } = dojo;

	await useDataSource(window, "fake:sandbox-setup-fails", "#/first-run");

	for (const size of SIZES)
	{
		await setViewport(window, size.width, size.height);
		await goTo(window, "#/first-run", "screen-firstRun", "first-run-engine");

		await window.getByRole("button", { name: "Use this engine" }).click();
		await window.getByRole("button", { name: "Choose a folder" }).click();
		await window.getByRole("button", { name: "Use this folder" }).click();
		await window.getByRole("button", { name: "Start the build" }).click();

		await expect(window.getByTestId("build-failed")).toBeVisible({ timeout: 15_000 });
		await expect(window.getByTestId("build-failed")).toContainText("Your code is not the problem");
		await expect(window.getByTestId("build-failed")).toContainText("Close Unreal Editor if it is open");
		await expect(window.getByTestId("build-failed").getByTestId("app-error")).toHaveAttribute("data-error-code", "build-environment-failed");
		await expect(window.getByTestId("build-failed")).not.toContainText("not in anything you wrote");
		await expectNoSidewaysScroll(window, `build failed at ${size.width}x${size.height}`);
		await screenshot(camera, window, "first-run-build-explained", size.width);

		// The reason fails once; building again passes, then the next size starts a new run of setup.
		await window.getByRole("button", { name: "Build again" }).click();
		await expect(window.getByTestId("build-succeeded")).toBeVisible({ timeout: 15_000 });
		await useDataSource(window, "fake:sandbox-setup-fails", "#/first-run");
	}
});

test("a sandbox folder that cannot be used says why and blocks the step until another is chosen", async ({ dojo, camera }) =>
{
	const { window } = dojo;

	await useDataSource(window, "fake:folder-blocked", "#/first-run");

	for (const size of SIZES)
	{
		await setViewport(window, size.width, size.height);
		await goTo(window, "#/first-run", "screen-firstRun", "first-run-engine");

		await window.getByRole("button", { name: "Use this engine" }).click();
		await window.getByRole("button", { name: "Choose a folder" }).click();

		await expect(window.getByTestId("sandbox-blocker")).toContainText("inside the Unreal Engine folder");
		await expect(window.getByTestId("sandbox-blocker")).toContainText("Choose a different folder");
		await expect(window.getByRole("button", { name: "Use this folder" })).toBeDisabled();
		await expectNoSidewaysScroll(window, `blocked folder at ${size.width}x${size.height}`);
		await screenshot(camera, window, "first-run-folder-blocked", size.width);

		await window.getByRole("button", { name: "Choose another folder" }).click();
		await expect(window.getByTestId("sandbox-blocker")).toHaveCount(0);
		await expect(window.getByRole("button", { name: "Use this folder" })).toBeEnabled();

		// The fake blocks only the first pick, so start over for the next size.
		await useDataSource(window, "fake:folder-blocked", "#/first-run");
	}
});

test("a screen that throws while rendering shows a friendly card and the rail keeps working", async ({ dojo, camera }) =>
{
	const { window } = dojo;

	await useDataSource(window, "fake:screen-crash");

	for (const size of SIZES)
	{
		await setViewport(window, size.width, size.height);
		await window.evaluate("location.hash = '#/'");
		await expect(window.getByTestId("screen-title")).toBeVisible();

		await window.getByRole("link", { name: /Character/ }).click();
		await expect(window.getByTestId("screen-error")).toBeVisible();
		await expect(window.getByTestId("screen-error")).toContainText("Something went wrong on this screen");
		await expect(window.getByTestId("screen-error")).toContainText("Your progress is safe");
		await expectNoSidewaysScroll(window, `screen error at ${size.width}x${size.height}`);
		await window.getByRole("button", { name: "Show details" }).click();
		await expect(window.getByTestId("screen-error-details")).not.toBeEmpty();
		await screenshot(camera, window, "screen-error", size.width);

		// Reload tries the screen again; it still throws here, so the card comes back instead of a blank window.
		await window.getByRole("button", { name: "Reload" }).click();
		await expect(window.getByTestId("screen-error")).toBeVisible();

		// The frame around it still works: the rail reaches another screen, which renders normally.
		await window.getByRole("link", { name: /Settings/ }).click();
		await expect(window.getByTestId("screen-settings")).toBeVisible();
		await expect(window.getByTestId("screen-error")).toHaveCount(0);

		await window.getByRole("link", { name: /Character/ }).click();
		await expect(window.getByTestId("screen-error")).toBeVisible();
		await window.getByRole("button", { name: "Go to Studio" }).click();
		await expect(window.getByTestId("screen-studio")).toBeVisible();
		await expect(window.getByTestId("screen-error")).toHaveCount(0);
	}
});

test("a save notice the main process repeats on every read is dismissed once and stays dismissed across screens and a refocus", async ({ dojo, camera }) =>
{
	const { window } = dojo;
	const notice = "restored your progress from its backup copy";

	await useDataSource(window, "fake:save-notice");
	await setViewport(window, 1440, 900);

	await goTo(window, "#/", "screen-title", "environment-chips");
	await expect(window.getByTestId("save-notice")).toContainText(notice);

	await goTo(window, "#/settings", "screen-settings", "review-providers");
	await expect(window.getByTestId("settings-engine").getByTestId("save-notice")).toContainText(notice);
	await expectNoSidewaysScroll(window, "settings with a save notice");
	await screenshot(camera, window, "settings-save-notice", 1440);

	await window.getByTestId("save-notice").getByRole("button", { name: "Dismiss" }).click();
	await expect(window.getByTestId("save-notice")).toHaveCount(0);

	// Another screen, then a refocus that reads the environment again: the fake sends the notice every time, and it stays hidden.
	await goTo(window, "#/", "screen-title", "environment-chips");
	await expect(window.getByTestId("save-notice")).toHaveCount(0);

	await window.evaluate("window.dispatchEvent(new Event('focus'))");
	await expect(window.getByTestId("chip-engine")).toBeVisible();
	await window.waitForTimeout(500);
	await expect(window.getByTestId("save-notice")).toHaveCount(0);

	await goTo(window, "#/settings", "screen-settings", "review-providers");
	await expect(window.getByTestId("save-notice")).toHaveCount(0);
});
