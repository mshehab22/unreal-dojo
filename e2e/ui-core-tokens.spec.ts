// ui-core M0.3: the frame navigates between every placeholder screen, Cmd/Ctrl+K and Esc work, and the token gallery renders.
// Page scripts are passed as strings because e2e is typechecked without the DOM library.
// Saves screenshots of each screen at 1100x700 and 1440x900 to test-results/; SAVE_PROOF=1 also copies them to docs/iterations/m0-3-*.png.
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

import { _electron as electron, expect, test, type ElectronApplication, type Page, type TestInfo } from "@playwright/test";

/** The two sizes every screen must work at (docs/systems/ui-core.md). */
const SIZES = [
	{ width: 1100, height: 700 },
	{ width: 1440, height: 900 },
] as const;

/** Each screen's route hash, test id, heading, and screenshot name. */
const SCREENS = [
	{ hash: "#/", testId: "screen-title", heading: "Unreal Dojo", file: "title" },
	{ hash: "#/studio", testId: "screen-studio", heading: "Studio", file: "studio" },
	{ hash: "#/world-map", testId: "screen-worldMap", heading: "World Map", file: "world-map" },
	{ hash: "#/character", testId: "screen-character", heading: "Character", file: "character" },
	{ hash: "#/codex", testId: "screen-codex", heading: "Codex", file: "codex" },
	{ hash: "#/settings", testId: "screen-settings", heading: "Settings", file: "settings" },
	{ hash: "#/dev/tokens", testId: "screen-devTokens", heading: "Design tokens", file: "dev-tokens" },
] as const;

const SHORTCUT_MODIFIER = process.platform === "darwin" ? "Meta" : "Control";

let electronApp: ElectronApplication;
let window: Page;

/** Screenshots the page into test-results/, and into docs/iterations/ as proof when SAVE_PROOF=1. */
async function saveScreenshot(testInfo: TestInfo, name: string): Promise<void>
{
	const path = testInfo.outputPath(`m0-3-${name}.png`);

	await window.screenshot({ path });

	if (process.env["SAVE_PROOF"] === "1") copyFileSync(path, resolve(`docs/iterations/m0-3-${name}.png`));
}

/** Forces the page to render at an exact size, independent of how large the OS lets the window be. */
async function setViewport(width: number, height: number): Promise<void>
{
	const session = await window.context().newCDPSession(window);

	await session.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
}

/** Moves the app to a route hash and waits for its screen and fonts. */
async function goTo(hash: string, testId: string): Promise<void>
{
	await window.evaluate(`location.hash = ${JSON.stringify(hash)}`);
	await expect(window.getByTestId(testId)).toBeVisible();
	await window.evaluate("document.fonts.ready.then(() => true)");
}

test.beforeAll(async () =>
{
	electronApp = await electron.launch({ args: [resolve(".")] });
	window = await electronApp.firstWindow();
	await window.waitForLoadState("domcontentloaded");

	// Reduced motion zeroes every duration token, so screenshots never catch a transition halfway.
	await window.emulateMedia({ reducedMotion: "reduce" });
});

test.afterAll(async () =>
{
	await electronApp.close();
});

test("every placeholder screen and the token gallery render at both sizes", async ({}, testInfo) =>
{
	for (const size of SIZES)
	{
		await setViewport(size.width, size.height);

		for (const screen of SCREENS)
		{
			await goTo(screen.hash, screen.testId);
			await expect(window.getByRole("heading", { level: 1, name: screen.heading, exact: true })).toBeVisible();

			// Nothing may scroll sideways at either size.
			const overflowsSideways = await window.evaluate<boolean>("(() => { const stage = document.querySelector('main'); return stage ? stage.scrollWidth > stage.clientWidth : true; })()");
			expect(overflowsSideways, `${screen.file} at ${size.width}x${size.height}`).toBe(false);

			await saveScreenshot(testInfo, `${screen.file}-${size.width}x${size.height}`);
		}
	}
});

test("the token gallery shows every pack accent and reads tokens live", async ({}, testInfo) =>
{
	await setViewport(1440, 900);
	await goTo("#/dev/tokens", "screen-devTokens");

	for (const pack of ["foundations", "patterns", "mechanics", "systems"])
	{
		await expect(window.getByTestId(`pack-${pack}`)).toBeVisible();
	}

	await expect(window.getByText("#0a0b0f", { exact: true })).toBeVisible();

	// The stage scrolls inside the frame, so grow the viewport to the content's height for one full-length picture.
	const contentHeight = await window.evaluate<number>("(document.querySelector('main')?.scrollHeight ?? 0) + 48");
	await setViewport(1440, contentHeight);
	await saveScreenshot(testInfo, "dev-tokens-full-1440");
	await setViewport(1440, 900);
});

test("the rail navigates, Cmd/Ctrl+K opens Codex search, and Esc closes it", async ({}, testInfo) =>
{
	await setViewport(1100, 700);
	await goTo("#/", "screen-title");

	await window.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /World Map/ }).click();
	await expect(window.getByTestId("screen-worldMap")).toBeVisible();
	await expect(window.getByRole("link", { name: /World Map/ })).toHaveAttribute("aria-current", "page");

	await window.keyboard.press(`${SHORTCUT_MODIFIER}+K`);
	await expect(window.getByTestId("codex-search")).toBeVisible();
	await expect(window.getByRole("textbox", { name: "Search the Codex" })).toBeFocused();
	await saveScreenshot(testInfo, "codex-search-1100x700");

	await window.keyboard.press("Escape");
	await expect(window.getByTestId("codex-search")).toBeHidden();

	await window.getByTestId("rail-codex-search").click();
	await expect(window.getByTestId("codex-search")).toBeVisible();
	await window.keyboard.press("Escape");
	await expect(window.getByTestId("codex-search")).toBeHidden();
});
