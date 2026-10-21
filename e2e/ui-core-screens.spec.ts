// ui-core M2.1: every core screen against the typed fake DojoApi (A240), at 1100x700 and 1440x900, plus the first-run flow,
// a failing first build with retry, Codex search, a locked stage's reason, Settings actions, and the real bridge's error view.
// Page scripts are passed as strings because e2e is typechecked without the DOM library.
// Saves screenshots to test-results/; SAVE_PROOF=1 also writes them to docs/iterations/m2-1-*.jpg at one pixel per CSS pixel.
import { resolve } from "node:path";

import { _electron as electron, expect, test, type ElectronApplication, type Page, type TestInfo } from "@playwright/test";

/** The two sizes every screen must work at (docs/systems/ui-core.md). */
const SIZES = [
	{ width: 1100, height: 700 },
	{ width: 1440, height: 900 },
] as const;

/** Each screen's route hash, test id, screenshot name, and the element that proves its slowest data arrived, for a returning learner. */
const SCREENS = [
	{ hash: "#/", testId: "screen-title", file: "title", ready: "environment-chips" },
	{ hash: "#/studio", testId: "screen-studio", file: "studio", ready: "studio-engine-room" },
	{ hash: "#/world-map", testId: "screen-worldMap", file: "world-map", ready: "test-out" },
	{ hash: "#/character", testId: "screen-character", file: "character", ready: "skill-tree" },
	{ hash: "#/codex", testId: "screen-codex", file: "codex", ready: "codex-entry" },
	{ hash: "#/settings", testId: "screen-settings", file: "settings", ready: "review-providers" },
] as const;

const SHORTCUT_MODIFIER = process.platform === "darwin" ? "Meta" : "Control";

let electronApp: ElectronApplication;
let window: Page;

/** Screenshots the page into test-results/, and as a JPG at CSS pixel size into docs/iterations/ when SAVE_PROOF=1. */
async function saveScreenshot(testInfo: TestInfo, name: string): Promise<void>
{
	await window.screenshot({ path: testInfo.outputPath(`m2-1-${name}.png`) });

	if (process.env["SAVE_PROOF"] === "1") await window.screenshot({ path: resolve(`docs/iterations/m2-1-${name}.jpg`), type: "jpeg", quality: 82, scale: "css" });
}

/** Forces the page to render at an exact size, independent of how large the OS lets the window be (A90). */
async function setViewport(width: number, height: number): Promise<void>
{
	const session = await window.context().newCDPSession(window);

	await session.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
}

/** Switches the data source ("fake:<scenario>" or "bridge") and reloads, which also resets the fake's state. */
async function useDataSource(value: string, hash = "#/"): Promise<void>
{
	await window.evaluate(`localStorage.setItem("dojo.dataSource", ${JSON.stringify(value)}); location.hash = ${JSON.stringify(hash)}`);
	await window.reload();
	await window.waitForLoadState("domcontentloaded");
}

/** Moves the app to a route hash and waits for its screen, its data (and the given element, when named), and fonts. */
async function goTo(hash: string, testId: string, ready?: string): Promise<void>
{
	await window.evaluate(`location.hash = ${JSON.stringify(hash)}`);
	await expect(window.getByTestId(testId)).toBeVisible();
	await expect(window.getByTestId(testId).getByTestId("loading")).toHaveCount(0);

	if (ready) await expect(window.getByTestId(ready).first()).toBeVisible();

	await window.evaluate("document.fonts.ready.then(() => true)");
}

/** Fails when the stage scrolls sideways. */
async function expectNoSidewaysScroll(label: string): Promise<void>
{
	const overflows = await window.evaluate<boolean>("(() => { const stage = document.querySelector('main'); return stage ? stage.scrollWidth > stage.clientWidth : true; })()");

	expect(overflows, label).toBe(false);
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
	await window.evaluate(`localStorage.removeItem("dojo.dataSource")`);
	await electronApp.close();
});

test("every core screen renders for a returning learner at both sizes", async ({}, testInfo) =>
{
	await useDataSource("fake:returning");

	for (const size of SIZES)
	{
		await setViewport(size.width, size.height);

		for (const screen of SCREENS)
		{
			await goTo(screen.hash, screen.testId, screen.ready);
			await expect(window.getByRole("heading", { level: 1 })).toHaveCount(1);
			await expect(window.getByTestId("app-error")).toHaveCount(0);
			await expectNoSidewaysScroll(`${screen.file} at ${size.width}x${size.height}`);
			await saveScreenshot(testInfo, `${screen.file}-${size.width}x${size.height}`);
		}
	}

	// The drag strip stays on top of every screen (app-shell).
	await expect(window.getByTestId("title-bar-drag-region")).toHaveCSS("-webkit-app-region", "drag");
});

test("the long screens in full at 1440 wide", async ({}, testInfo) =>
{
	await useDataSource("fake:returning");

	for (const screen of SCREENS.filter((candidate) => candidate.file !== "title"))
	{
		await setViewport(1440, 900);
		await goTo(screen.hash, screen.testId, screen.ready);

		// The stage scrolls inside the frame, so grow the viewport to the content's height for one full-length picture.
		const contentHeight = await window.evaluate<number>("(document.querySelector('main')?.scrollHeight ?? 0) + 48");
		await setViewport(1440, Math.max(900, contentHeight));
		await saveScreenshot(testInfo, `${screen.file}-full-1440`);
	}

	await setViewport(1440, 900);
});

test("screens show the returning learner's real numbers", async () =>
{
	await useDataSource("fake:returning");
	await setViewport(1440, 900);

	await goTo("#/", "screen-title");
	await expect(window.getByTestId("chip-engine")).toContainText("UE 5.8.3");

	// The Mac never gets the fast loop promise (A45).
	if (process.platform === "darwin") await expect(window.getByTestId("chip-loop")).toContainText("Headless loop");

	await goTo("#/studio", "screen-studio");
	await expect(window.getByRole("heading", { level: 1 })).toHaveText("Night Owl Studio");
	await expect(window.getByTestId("xp-bar")).toContainText("Level 4");
	await expect(window.getByTestId("daily-offer")).toHaveCount(3);
	await expect(window.getByTestId("daily-offer").first()).toContainText("6 to 10 due items");
	await expect(window.getByTestId("studio-daily")).toContainText("September 2026");
	// Start drill opens the drill screen since M2.2.
	await expect(window.getByTestId("start-drill")).toBeEnabled();
	await window.getByTestId("daily-offer").nth(1).getByRole("button", { name: "Pick this one" }).click();
	await expect(window.getByTestId("daily-offer").nth(1)).toHaveAttribute("data-chosen", "true");

	await goTo("#/world-map", "screen-worldMap", "test-out");
	await expect(window.locator('[data-testid="stage-node"][data-rematch="true"]')).toHaveCount(1);
	await expect(window.locator('[data-testid="stage-node"][data-status="in_progress"]')).toHaveCount(1);

	// Test out opens the drill screen since M2.2.
	await expect(window.getByTestId("test-out")).toBeEnabled();

	await goTo("#/character", "screen-character");
	await expect(window.locator('[data-testid="pattern-card"][data-tier]')).toHaveCount(3);
	await expect(window.getByTestId("skill-node").first()).toBeVisible();
});

test("a locked stage explains why on hover", async ({}, testInfo) =>
{
	await useDataSource("fake:returning");
	await setViewport(1440, 900);
	await goTo("#/world-map", "screen-worldMap", "test-out");

	const locked = window.locator('[data-testid="stage-node"][data-status="locked"]').first();
	await locked.scrollIntoViewIfNeeded();
	await locked.hover();
	await expect(window.getByRole("tooltip")).toContainText("first");
	await saveScreenshot(testInfo, "world-map-locked-reason-1440x900");
});

test("Cmd/Ctrl+K searches the glossary and opens the term in the Codex", async ({}, testInfo) =>
{
	await useDataSource("fake:returning");
	await setViewport(1100, 700);
	await goTo("#/studio", "screen-studio");

	await window.keyboard.press(`${SHORTCUT_MODIFIER}+K`);
	await expect(window.getByTestId("codex-search")).toBeVisible();
	await window.keyboard.type("uprop");
	await expect(window.getByTestId("codex-search-results")).toContainText("UPROPERTY");
	await saveScreenshot(testInfo, "codex-search-1100x700");

	await window.keyboard.press("Enter");
	await expect(window.getByTestId("codex-search")).toBeHidden();
	await expect(window.getByTestId("screen-codex")).toBeVisible();
	await expect(window.getByTestId("codex-entry")).toHaveAttribute("data-term", "uproperty");

	await window.getByRole("button", { name: "Drill me" }).click();
	await expect(window.getByTestId("drill-queued")).toBeVisible();

	await window.getByTestId("codex-category").selectOption("containers");
	await expect(window.getByTestId("codex-list").getByRole("button")).toHaveCount(4);
	await window.keyboard.press("Escape");
});

test("Settings: test Claude Code, store an API key masked, and confirm before a reset", async ({}, testInfo) =>
{
	await useDataSource("fake:returning");
	await setViewport(1100, 700);
	await goTo("#/settings", "screen-settings", "review-providers");
	await expect(window.getByTestId("review-providers").getByRole("listitem")).toHaveCount(3);

	await window.getByRole("button", { name: "Test Claude Code" }).click();
	await expect(window.getByTestId("claude-test-result")).toContainText("answered");

	await window.getByRole("textbox", { name: "Anthropic API key" }).fill("sk-ant-test-0000000000");
	await window.getByRole("button", { name: "Save" }).first().click();
	await expect(window.getByTestId("api-key-masked")).toBeVisible();

	await window.getByRole("button", { name: "Reset progress" }).click();
	await expect(window.getByTestId("reset-confirm")).toBeVisible();
	await saveScreenshot(testInfo, "settings-reset-confirm-1100x700");
	await window.getByRole("button", { name: "Reset everything" }).click();
	await expect(window.getByTestId("reset-confirm")).toBeHidden();

	await goTo("#/character", "screen-character");
	await expect(window.locator('[data-testid="pattern-card"][data-tier]')).toHaveCount(0);
});

test("first run: name, engine, sandbox folder, full build with progress, editor, into the Studio", async ({}, testInfo) =>
{
	await useDataSource("fake:fresh");
	await setViewport(1100, 700);
	await goTo("#/", "screen-title");

	await expect(window.getByTestId("fresh-start")).toBeVisible();
	await expect(window.getByTestId("chip-engine")).toContainText("Not set");
	await saveScreenshot(testInfo, "title-fresh-1100x700");
	await window.getByRole("textbox", { name: "What should your studio call you?" }).fill("Mohammad");
	await window.getByRole("button", { name: "Set up your studio" }).click();

	await goTo("#/first-run", "screen-firstRun");
	await expect(window.getByTestId("engine-option")).toHaveCount(2);
	await expect(window.getByTestId("toolchain-ok")).toBeVisible();
	await saveScreenshot(testInfo, "first-run-engine-1100x700");
	await window.getByRole("button", { name: "Use this engine" }).click();

	await window.getByRole("button", { name: "Choose a folder" }).click();
	await expect(window.getByTestId("sandbox-folder")).toBeVisible();
	await saveScreenshot(testInfo, "first-run-sandbox-1100x700");
	await window.getByRole("button", { name: "Use this folder" }).click();

	await window.getByRole("button", { name: "Start the build" }).click();
	await expect(window.getByTestId("build-progress")).toHaveAttribute("data-phase", "building");
	await saveScreenshot(testInfo, "first-run-build-progress-1100x700");
	await expect(window.getByTestId("build-succeeded")).toBeVisible({ timeout: 15_000 });
	await saveScreenshot(testInfo, "first-run-build-done-1100x700");
	await window.getByRole("button", { name: "Continue" }).click();

	await window.getByRole("button", { name: "Open the editor" }).click();
	await expect(window.getByTestId("editor-connected")).toBeVisible();
	await window.getByRole("button", { name: "Continue" }).click();

	await expect(window.getByTestId("first-run-done")).toBeVisible();
	await saveScreenshot(testInfo, "first-run-done-1100x700");
	await window.getByRole("button", { name: "Enter your studio" }).click();

	await expect(window.getByTestId("screen-studio")).toBeVisible();
	await expect(window.getByTestId("studio-lead")).toContainText("Mohammad");
	await expect(window.getByTestId("studio-lead")).toContainText("Apprentice");
	await saveScreenshot(testInfo, "studio-fresh-1100x700");

	// Setup stored the engine through updateSettings and the sandbox through createSandbox.
	await goTo("#/settings", "screen-settings", "review-providers");
	await expect(window.getByTestId("settings-engine")).toContainText("UE 5.8.3");
	await expect(window.getByTestId("settings-engine")).toContainText("DojoSandbox");
});

test("a failing first build explains itself in plain English and the retry works", async ({}, testInfo) =>
{
	await useDataSource("fake:first-build-fails", "#/first-run");
	await setViewport(1100, 700);
	await goTo("#/first-run", "screen-firstRun");

	await window.getByRole("button", { name: "Use this engine" }).click();
	await window.getByRole("button", { name: "Choose a folder" }).click();
	await window.getByRole("button", { name: "Use this folder" }).click();
	await window.getByRole("button", { name: "Start the build" }).click();

	await expect(window.getByTestId("build-failed")).toBeVisible({ timeout: 15_000 });
	await expect(window.getByTestId("build-failed")).toContainText("not in anything you wrote");
	await expect(window.getByTestId("build-progress")).toHaveAttribute("data-outcome", "failed");
	await window.getByRole("button", { name: "Show the compiler output" }).click();
	await saveScreenshot(testInfo, "first-run-build-failed-1100x700");

	await window.getByRole("button", { name: "Build again" }).click();
	await expect(window.getByTestId("build-succeeded")).toBeVisible({ timeout: 15_000 });
});

test("a cancelled first build is calm, and starting again works", async () =>
{
	await useDataSource("fake:fresh", "#/first-run");
	await setViewport(1100, 700);
	await goTo("#/first-run", "screen-firstRun");

	await window.getByRole("button", { name: "Use this engine" }).click();
	await window.getByRole("button", { name: "Choose a folder" }).click();
	await window.getByRole("button", { name: "Use this folder" }).click();
	await window.getByRole("button", { name: "Start the build" }).click();
	await expect(window.getByTestId("build-progress")).toHaveAttribute("data-phase", "building");
	await window.getByRole("button", { name: "Cancel" }).click();

	await expect(window.getByTestId("build-cancelled")).toBeVisible();
	await expect(window.getByTestId("build-progress")).toHaveAttribute("data-outcome", "cancelled");
	await expect(window.getByTestId("app-error")).toHaveCount(0);

	await window.getByRole("button", { name: "Start again" }).click();
	await expect(window.getByTestId("build-succeeded")).toBeVisible({ timeout: 15_000 });
});

test("against the real bridge, the title works and the Studio shows real data or the AppError view", async ({}, testInfo) =>
{
	await useDataSource("bridge");
	await setViewport(1100, 700);

	await expect(window.getByRole("heading", { name: "Unreal Dojo" })).toBeVisible();
	await expect(window.getByTestId("app-version")).not.toBeEmpty();
	await expect(window.getByTestId("fake-data-badge")).toHaveCount(0);

	// Services land one by one (progress and rules are real since M1.6), so the Studio shows either its panels or the plain-English
	// error view for whatever is still missing, never a blank or crashed screen.
	await window.evaluate(`location.hash = "#/studio"`);
	await expect(window.getByTestId("screen-studio")).toBeVisible();
	await expect(window.getByTestId("app-error").or(window.getByTestId("studio-lead")).first()).toBeVisible();
	await saveScreenshot(testInfo, "studio-bridge-1100x700");
});
