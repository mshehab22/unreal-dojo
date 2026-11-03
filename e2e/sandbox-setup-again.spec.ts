// ui-core M5.1k: a returning learner whose sandbox folder was deleted (fake scenario "sandbox-deleted") sets it up again from Settings.
// Rebuild sandbox is refused with the preflight's words, which name Set up the sandbox again and offer no retry; the button opens first-run's
// folder and build steps inside the Sandbox row; the build passes, the row says Ready, and Rebuild sandbox works again. At 1100x700 and 1440x900 with no sideways scroll.
// Page scripts are passed as strings because e2e is typechecked without the DOM library.
// Saves screenshots to test-results/; with SAVE_PROOF=1 the 1440x900 ones are also written to docs/iterations/m5-1k-*.jpg.
import type { Page } from "@playwright/test";

import { expect, test } from "./support/dojoTest";
import type { ProofCamera } from "./support/ProofCamera";

/** The two sizes every screen must work at (docs/systems/ui-core.md). */
const SIZES = [
	{ width: 1100, height: 700 },
	{ width: 1440, height: 900 },
] as const;

/** The preflight's headline for a sandbox that is gone, as main words it (`sandboxMovedOrDeleted`). */
const MISSING_MESSAGE = "The sandbox project could not be found at";

/** The action every message about a deleted sandbox now names. */
const SETUP_AGAIN = "Set up the sandbox again";

/** The fake simulates a full build in a few seconds; this leaves room on a slow runner. */
const FAKE_BUILD_TIMEOUT_MS = 20_000;

/** Forces the page to render at an exact size, independent of how large the OS lets the window be (A90). */
async function setViewport(window: Page, width: number, height: number): Promise<void>
{
	const session = await window.context().newCDPSession(window);

	await session.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
}

/** Switches to a fresh fake in the sandbox-deleted scenario and opens Settings with its data loaded. */
async function openSettingsWithDeletedSandbox(window: Page): Promise<void>
{
	await window.evaluate(`localStorage.setItem("dojo.dataSource", "fake:sandbox-deleted"); location.hash = "#/settings"`);
	await window.reload();
	await window.waitForLoadState("domcontentloaded");
	await expect(window.getByTestId("screen-settings")).toBeVisible();
	await expect(window.getByTestId("screen-settings").getByTestId("loading")).toHaveCount(0);
	await expect(window.getByTestId("review-providers").first()).toBeVisible();
	await window.evaluate("document.fonts.ready.then(() => true)");
}

/** Fails when the stage scrolls sideways. */
async function expectNoSidewaysScroll(window: Page, label: string): Promise<void>
{
	const overflows = await window.evaluate<boolean>("(() => { const stage = document.querySelector('main'); return stage ? stage.scrollWidth > stage.clientWidth : true; })()");

	expect(overflows, label).toBe(false);
}

/** Scrolls the sandbox row into view, then screenshots into test-results/; the 1440x900 pictures are also proof pictures (JPG) when the test passes with SAVE_PROOF=1. */
async function screenshot(camera: ProofCamera, window: Page, name: string, width: number): Promise<void>
{
	await window.getByTestId("settings-sandbox").scrollIntoViewIfNeeded();

	if (width < 1440)
	{
		await window.screenshot({ path: test.info().outputPath(`m5-1k-${name}-${width}.png`) });
		return;
	}

	await camera.capture(window, `m5-1k-${name}.png`, { proofFileName: `m5-1k-${name}.jpg`, proofFormat: "jpeg" });
}

// Each test gets a fresh app and userData folder, so the data-source choice in localStorage never leaks into the next test.
test.beforeEach(async ({ dojo }) =>
{
	// Reduced motion zeroes every duration token, so screenshots never catch a transition halfway.
	await dojo.window.emulateMedia({ reducedMotion: "reduce" });
});

test("a deleted sandbox is set up again from Settings with first-run's steps, and Rebuild sandbox works again", async ({ dojo, camera }) =>
{
	test.setTimeout(150_000);

	const { window } = dojo;

	for (const size of SIZES)
	{
		await setViewport(window, size.width, size.height);
		await openSettingsWithDeletedSandbox(window);
		const label = `at ${size.width}x${size.height}`;
		const row = window.getByTestId("settings-sandbox");

		// The row says the sandbox is not built and names both ways out.
		await expect(row).toContainText("Not built");
		await expect(row.getByTestId("sandbox-missing-hint")).toContainText(SETUP_AGAIN);

		// Rebuild is refused with the preflight's words, which point at the new button, and there is no retry that cannot work.
		await row.getByRole("button", { name: "Rebuild sandbox" }).click();
		await expect(row.getByTestId("app-error")).toContainText(MISSING_MESSAGE);
		await expect(row.getByTestId("app-error")).toContainText(`or use ${SETUP_AGAIN} to create a new one`);
		await expect(row.getByTestId("app-error")).not.toContainText("open Settings");
		await expect(row.getByTestId("app-error")).toHaveAttribute("data-error-code", "sandbox-not-ready");
		await expect(row.getByTestId("app-error").getByRole("button", { name: "Try again" })).toHaveCount(0);
		await expectNoSidewaysScroll(window, `rebuild refused ${label}`);
		await screenshot(camera, window, "rebuild-refused", size.width);

		// The button opens first-run's folder step inside the row; the old rebuild error makes way, and Rebuild is off while it is open.
		await row.getByRole("button", { name: SETUP_AGAIN }).click();
		const flow = row.getByTestId("sandbox-setup-again");
		await expect(flow.getByTestId("first-run-sandbox")).toBeVisible();
		await expect(flow).toContainText("To put it back where it was, choose");
		await expect(row.getByTestId("app-error")).toHaveCount(0);
		await expect(row.getByRole("button", { name: "Rebuild sandbox" })).toBeDisabled();
		await expect(window.getByRole("button", { name: "Pick another engine" })).toBeDisabled();
		await flow.getByRole("button", { name: "Choose a folder" }).click();
		await expect(flow.getByTestId("sandbox-folder")).toBeVisible();
		await expectNoSidewaysScroll(window, `folder step ${label}`);
		await screenshot(camera, window, "folder-step", size.width);

		// Then first-run's build step, with its progress view, to a pass.
		await flow.getByRole("button", { name: "Use this folder" }).click();
		await expect(flow.getByTestId("first-run-build")).toBeVisible();
		await flow.getByRole("button", { name: "Start the build" }).click();
		await expect(flow.getByTestId("build-progress")).toBeVisible();
		await expect(flow.getByTestId("build-succeeded")).toBeVisible({ timeout: FAKE_BUILD_TIMEOUT_MS });
		await expectNoSidewaysScroll(window, `build passed ${label}`);
		await screenshot(camera, window, "build-passed", size.width);

		// Continue closes the steps; the row now says Ready, and a rebuild of the new sandbox passes.
		await flow.getByRole("button", { name: "Continue" }).click();
		await expect(row.getByTestId("sandbox-setup-again")).toHaveCount(0);
		await expect(row).toContainText("Ready");
		await expect(row.getByTestId("sandbox-missing-hint")).toHaveCount(0);
		await expect(window.getByRole("button", { name: "Pick another engine" })).toBeEnabled();
		await row.getByRole("button", { name: "Rebuild sandbox" }).click();
		await expect(row).toContainText("Rebuilt in", { timeout: FAKE_BUILD_TIMEOUT_MS });
		await expect(row.getByTestId("app-error")).toHaveCount(0);
		await expectNoSidewaysScroll(window, `rebuilt ${label}`);
		await screenshot(camera, window, "ready-again", size.width);
	}
});

test("Cancel on the folder step closes Set up the sandbox again without changing the sandbox", async ({ dojo }) =>
{
	const { window } = dojo;

	await openSettingsWithDeletedSandbox(window);
	const row = window.getByTestId("settings-sandbox");
	const pathBefore = await row.textContent();

	await row.getByRole("button", { name: SETUP_AGAIN }).click();
	await row.getByTestId("sandbox-setup-again").getByRole("button", { name: "Cancel" }).click();

	await expect(row.getByTestId("sandbox-setup-again")).toHaveCount(0);
	await expect(row.getByRole("button", { name: SETUP_AGAIN })).toBeEnabled();
	await expect(row.getByRole("button", { name: "Rebuild sandbox" })).toBeEnabled();
	expect(await row.textContent()).toBe(pathBefore);
});

test("a set up again build that is cancelled starts again from the copy it made, instead of being refused for a folder that is not empty", async ({ dojo }) =>
{
	const { window } = dojo;

	await openSettingsWithDeletedSandbox(window);
	const row = window.getByTestId("settings-sandbox");

	await row.getByRole("button", { name: SETUP_AGAIN }).click();
	const flow = row.getByTestId("sandbox-setup-again");
	await flow.getByRole("button", { name: "Choose a folder" }).click();
	await flow.getByRole("button", { name: "Use this folder" }).click();
	await flow.getByRole("button", { name: "Start the build" }).click();
	await expect(flow.getByTestId("build-progress")).toHaveAttribute("data-phase", "building", { timeout: FAKE_BUILD_TIMEOUT_MS });
	await flow.getByRole("button", { name: "Cancel" }).click();
	await expect(flow.getByTestId("build-cancelled")).toBeVisible();

	// The folder now holds the copy, as in main: starting again rebuilds it, so no "already has files" refusal appears.
	await flow.getByRole("button", { name: "Start again" }).click();
	await expect(flow.getByTestId("build-succeeded")).toBeVisible({ timeout: FAKE_BUILD_TIMEOUT_MS });
	await expect(flow.getByTestId("app-error")).toHaveCount(0);
	await flow.getByRole("button", { name: "Continue" }).click();
	await expect(row).toContainText("Ready");
});
