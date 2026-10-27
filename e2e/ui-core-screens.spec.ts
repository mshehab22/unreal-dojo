// ui-core M2.1: every core screen against the typed fake DojoApi (A240), at 1100x700 and 1440x900, plus the first-run flow,
// a failing first build with retry, a first build whose progress and answer go missing (A822), Codex search, a locked stage's reason, Settings actions, the real bridge's error view, and a Studio read main never answers (W12).
// Page scripts are passed as strings because e2e is typechecked without the DOM library.
// Saves screenshots to test-results/; with SAVE_PROOF=1 a passing test also writes them to docs/iterations/m2-1-*.jpg at one pixel per CSS pixel.
import type { Page } from "@playwright/test";

import { expect, test } from "./support/dojoTest";
import { scrollIntoViewNow } from "./support/hoverAtCentre";
import { stubFirstAnswerNeverComes } from "./support/ipcStubs";
import type { ProofCamera } from "./support/ProofCamera";

/** The two sizes every screen must work at (docs/systems/ui-core.md). */
const SIZES = [
	{ width: 1100, height: 700 },
	{ width: 1440, height: 900 },
] as const;

/** How long the real bridge's Studio gets to show its panels or the error view. It loads content and progress in the main process, and a slow CI runner once took more than the 5 s default (Windows run 40452256211); a normal run needs well under a second. */
const REAL_BRIDGE_STUDIO_TIMEOUT_MS = 20_000;

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

/** Screenshots the page into test-results/, and as a JPG at CSS pixel size into docs/iterations/ when the test passes with SAVE_PROOF=1. */
async function saveScreenshot(camera: ProofCamera, window: Page, name: string): Promise<void>
{
	await camera.capture(window, `m2-1-${name}.png`, { proofFileName: `m2-1-${name}.jpg`, proofFormat: "jpeg" });
}

/** Forces the page to render at an exact size, independent of how large the OS lets the window be (A90). */
async function setViewport(window: Page, width: number, height: number): Promise<void>
{
	const session = await window.context().newCDPSession(window);

	await session.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
}

/** Switches the data source ("fake:<scenario>" or "bridge") and reloads, which also resets the fake's state. */
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

// Each test gets a fresh app and userData folder, so the data-source choice in localStorage never leaks into the next test.
test.beforeEach(async ({ dojo }) =>
{
	// Reduced motion zeroes every duration token, so screenshots never catch a transition halfway.
	await dojo.window.emulateMedia({ reducedMotion: "reduce" });
});

test("every core screen renders for a returning learner at both sizes", async ({ dojo, camera }) =>
{
	const { window } = dojo;

	await useDataSource(window, "fake:returning");

	for (const size of SIZES)
	{
		await setViewport(window, size.width, size.height);

		for (const screen of SCREENS)
		{
			await goTo(window, screen.hash, screen.testId, screen.ready);
			await expect(window.getByRole("heading", { level: 1 })).toHaveCount(1);
			await expect(window.getByTestId("app-error")).toHaveCount(0);
			await expectNoSidewaysScroll(window, `${screen.file} at ${size.width}x${size.height}`);
			await saveScreenshot(camera, window, `${screen.file}-${size.width}x${size.height}`);
		}
	}

	// The drag strip stays on top of every screen (app-shell).
	await expect(window.getByTestId("title-bar-drag-region")).toHaveCSS("-webkit-app-region", "drag");
});

test("the long screens in full at 1440 wide", async ({ dojo, camera }) =>
{
	const { window } = dojo;

	await useDataSource(window, "fake:returning");

	for (const screen of SCREENS.filter((candidate) => candidate.file !== "title"))
	{
		await setViewport(window, 1440, 900);
		await goTo(window, screen.hash, screen.testId, screen.ready);

		// The stage scrolls inside the frame, so grow the viewport to the content's height for one full-length picture.
		const contentHeight = await window.evaluate<number>("(document.querySelector('main')?.scrollHeight ?? 0) + 48");
		await setViewport(window, 1440, Math.max(900, contentHeight));
		await saveScreenshot(camera, window, `${screen.file}-full-1440`);
	}

	await setViewport(window, 1440, 900);
});

test("screens show the returning learner's real numbers", async ({ dojo }) =>
{
	const { window } = dojo;

	await useDataSource(window, "fake:returning");
	await setViewport(window, 1440, 900);

	await goTo(window, "#/", "screen-title");
	await expect(window.getByTestId("chip-engine")).toContainText("UE 5.8.3");

	// The Mac never gets the fast loop promise (A45).
	if (process.platform === "darwin") await expect(window.getByTestId("chip-loop")).toContainText("Headless loop");

	await goTo(window, "#/studio", "screen-studio");
	await expect(window.getByRole("heading", { level: 1 })).toHaveText("Night Owl Studio");
	await expect(window.getByTestId("xp-bar")).toContainText("Level 4");
	await expect(window.getByTestId("daily-offer")).toHaveCount(3);
	await expect(window.getByTestId("daily-offer").first()).toContainText("6 to 10 due items");
	await expect(window.getByTestId("studio-daily")).toContainText("September 2026");
	// Start drill opens the drill screen since M2.2.
	await expect(window.getByTestId("start-drill")).toBeEnabled();
	await window.getByTestId("daily-offer").nth(1).getByRole("button", { name: "Pick this one" }).click();
	await expect(window.getByTestId("daily-offer").nth(1)).toHaveAttribute("data-chosen", "true");

	await goTo(window, "#/world-map", "screen-worldMap", "test-out");
	await expect(window.locator('[data-testid="stage-node"][data-rematch="true"]')).toHaveCount(1);
	await expect(window.locator('[data-testid="stage-node"][data-status="in_progress"]')).toHaveCount(1);

	// The first world is shaped like the real World 1: 12 stages. At 1100 wide they wrap into rows instead of scrolling sideways (A390).
	const firstWorld = window.locator('[data-testid="contract-card"][data-world="objects-and-reflection"]');
	await expect(firstWorld.getByTestId("stage-node")).toHaveCount(12);
	await setViewport(window, 1100, 700);
	await expect(firstWorld.getByTestId("stage-path")).not.toHaveAttribute("data-rows", "1");
	await expect(firstWorld.getByTestId("path-turn")).toHaveCount(1);
	await expect(firstWorld.getByTestId("stage-node").last()).toContainText("The training yard");
	await expectNoSidewaysScroll(window, "world map with 12 stages at 1100x700");
	await setViewport(window, 1440, 900);

	// Test out opens the drill screen since M2.2.
	await expect(window.getByTestId("test-out")).toBeEnabled();

	await goTo(window, "#/character", "screen-character");
	await expect(window.locator('[data-testid="pattern-card"][data-tier]')).toHaveCount(3);
	await expect(window.getByTestId("skill-node").first()).toBeVisible();
});

test("a locked stage explains why on hover", async ({ dojo, camera }) =>
{
	const { window } = dojo;

	await useDataSource(window, "fake:returning");
	await setViewport(window, 1440, 900);
	await goTo(window, "#/world-map", "screen-worldMap", "test-out");

	// Each path regroups its rows once the card is measured, which remounts its stages, so wait for every path to settle first (A980).
	await expect(window.locator('[data-testid="stage-path"]:not([data-measured="true"])')).toHaveCount(0);

	const locked = window.locator('[data-testid="stage-node"][data-status="locked"]').first();

	// The tooltip opens after a short delay and a hover can land while the page settles, so the scroll and hover are retried together;
	// the locator finds the node again on each attempt. The window is hidden (A77), so its animation frames arrive about a second apart and
	// later still when the machine is busy; Playwright's own scroll and hover wait for the node to hold still across two frames, which is
	// what ran out of time under load. So this scrolls the node into view itself and moves the pointer to its measured centre, with no frame wait.
	await expect(async () =>
	{
		await window.mouse.move(0, 0);
		await scrollIntoViewNow(locked);

		const box = await locked.boundingBox({ timeout: 3_000 });

		if (!box) throw new Error("The locked stage has no box yet.");

		await window.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await expect(window.getByRole("tooltip").first()).toContainText("first", { timeout: 3_000 });
	}).toPass({ timeout: 10_000 });
	await saveScreenshot(camera, window, "world-map-locked-reason-1440x900");
});

test("Cmd/Ctrl+K searches the glossary and opens the term in the Codex", async ({ dojo, camera }) =>
{
	const { window } = dojo;

	await useDataSource(window, "fake:returning");
	await setViewport(window, 1100, 700);
	await goTo(window, "#/studio", "screen-studio");

	await window.keyboard.press(`${SHORTCUT_MODIFIER}+K`);
	await expect(window.getByTestId("codex-search")).toBeVisible();
	await window.keyboard.type("uprop");
	await expect(window.getByTestId("codex-search-results")).toContainText("UPROPERTY");
	await saveScreenshot(camera, window, "codex-search-1100x700");

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

test("a pointer resting where results appear does not steal the keyboard highlight", async ({ dojo }) =>
{
	const { window } = dojo;

	await useDataSource(window, "fake:returning");
	await setViewport(window, 1100, 700);
	await goTo(window, "#/studio", "screen-studio");

	// With motion on, the palette rises into place under a resting pointer, which is when the learner and the tester hit this.
	await window.emulateMedia({ reducedMotion: "no-preference" });

	try
	{
		for (let run = 0; run < 5; run++)
		{
			// Rest the pointer just inside the top edge of where the second result row ends up, then the fourth, in turn (panel top 126 px,
			// input 56 px, list padding 8 px, rows 56 px). The panel's 8 px rise slides that row up under the still pointer.
			const restingRow = run % 2 === 0 ? 2 : 4;
			await window.mouse.move(550, 126 + 56 + 8 + 56 * (restingRow - 1) + 4);
			await window.keyboard.press(`${SHORTCUT_MODIFIER}+K`);
			await window.keyboard.type("uprop");

			await expect(window.getByTestId("codex-search-results").getByRole("option")).toHaveCount(4);
			await window.waitForTimeout(250);
			await expect(window.getByTestId("codex-search-results").getByRole("option").first(), `run ${run + 1}, pointer resting on row ${restingRow}`).toHaveAttribute("aria-selected", "true");
			await window.keyboard.press("Enter");
			await expect(window.getByTestId("codex-entry"), `run ${run + 1}`).toHaveAttribute("data-term", "uproperty");
		}

		// A real pointer movement still moves the highlight.
		await window.keyboard.press(`${SHORTCUT_MODIFIER}+K`);
		await window.keyboard.type("uprop");
		const secondRow = window.getByTestId("codex-search-results").getByRole("option").nth(1);
		const rowBox = await secondRow.boundingBox();

		if (!rowBox) throw new Error("the second row must have a box");

		await window.mouse.move(rowBox.x + rowBox.width / 2, rowBox.y + rowBox.height / 2, { steps: 4 });
		await expect(secondRow).toHaveAttribute("aria-selected", "true");
		await window.keyboard.press("Escape");
	}
	finally
	{
		await window.emulateMedia({ reducedMotion: "reduce" });
	}
});

test("Settings: test Claude Code, store an API key masked, and confirm before a reset", async ({ dojo, camera }) =>
{
	const { window } = dojo;

	await useDataSource(window, "fake:returning");
	await setViewport(window, 1100, 700);
	await goTo(window, "#/settings", "screen-settings", "review-providers");
	await expect(window.getByTestId("review-providers").getByRole("listitem")).toHaveCount(3);

	await window.getByRole("button", { name: "Test Claude Code" }).click();
	await expect(window.getByTestId("claude-test-result")).toContainText("answered");

	await window.getByRole("textbox", { name: "Anthropic API key" }).fill("sk-ant-test-0000000000");
	await window.getByRole("button", { name: "Save" }).first().click();
	await expect(window.getByTestId("api-key-masked")).toBeVisible();

	await window.getByRole("button", { name: "Reset progress" }).click();
	await expect(window.getByTestId("reset-confirm")).toBeVisible();
	await saveScreenshot(camera, window, "settings-reset-confirm-1100x700");
	await window.getByRole("button", { name: "Reset everything" }).click();
	await expect(window.getByTestId("reset-confirm")).toBeHidden();

	await goTo(window, "#/character", "screen-character");
	await expect(window.locator('[data-testid="pattern-card"][data-tier]')).toHaveCount(0);
});

test("first run: name, engine, sandbox folder, full build with progress, editor, into the Studio", async ({ dojo, camera }) =>
{
	const { window } = dojo;

	await useDataSource(window, "fake:fresh");
	await setViewport(window, 1100, 700);
	await goTo(window, "#/", "screen-title");

	await expect(window.getByTestId("fresh-start")).toBeVisible();
	await expect(window.getByTestId("chip-engine")).toContainText("Not set");
	await saveScreenshot(camera, window, "title-fresh-1100x700");
	await window.getByRole("textbox", { name: "What should your studio call you?" }).fill("Mohammad");
	await window.getByRole("button", { name: "Set up your studio" }).click();

	await goTo(window, "#/first-run", "screen-firstRun");
	await expect(window.getByTestId("engine-option")).toHaveCount(2);
	await expect(window.getByTestId("toolchain-ok")).toBeVisible();
	await saveScreenshot(camera, window, "first-run-engine-1100x700");
	await window.getByRole("button", { name: "Use this engine" }).click();

	await window.getByRole("button", { name: "Choose a folder" }).click();
	await expect(window.getByTestId("sandbox-folder")).toBeVisible();
	await saveScreenshot(camera, window, "first-run-sandbox-1100x700");
	await window.getByRole("button", { name: "Use this folder" }).click();

	await window.getByRole("button", { name: "Start the build" }).click();
	await expect(window.getByTestId("build-progress")).toHaveAttribute("data-phase", "building");
	await saveScreenshot(camera, window, "first-run-build-progress-1100x700");
	await expect(window.getByTestId("build-succeeded")).toBeVisible({ timeout: 15_000 });
	await saveScreenshot(camera, window, "first-run-build-done-1100x700");
	await window.getByRole("button", { name: "Continue" }).click();

	await window.getByRole("button", { name: "Open the editor" }).click();
	await expect(window.getByTestId("editor-connected")).toBeVisible();
	await window.getByRole("button", { name: "Continue" }).click();

	await expect(window.getByTestId("first-run-done")).toBeVisible();
	await saveScreenshot(camera, window, "first-run-done-1100x700");
	await window.getByRole("button", { name: "Enter your studio" }).click();

	await expect(window.getByTestId("screen-studio")).toBeVisible();
	await expect(window.getByTestId("studio-lead")).toContainText("Mohammad");
	await expect(window.getByTestId("studio-lead")).toContainText("Apprentice");
	await saveScreenshot(camera, window, "studio-fresh-1100x700");

	// Setup stored the engine through updateSettings and the sandbox through createSandbox.
	await goTo(window, "#/settings", "screen-settings", "review-providers");
	await expect(window.getByTestId("settings-engine")).toContainText("UE 5.8.3");
	await expect(window.getByTestId("settings-engine")).toContainText("DojoSandbox");
});

test("a failing first build explains itself in plain English and the retry works", async ({ dojo, camera }) =>
{
	const { window } = dojo;

	await useDataSource(window, "fake:first-build-fails", "#/first-run");
	await setViewport(window, 1100, 700);
	await goTo(window, "#/first-run", "screen-firstRun");

	await window.getByRole("button", { name: "Use this engine" }).click();
	await window.getByRole("button", { name: "Choose a folder" }).click();
	await window.getByRole("button", { name: "Use this folder" }).click();
	await window.getByRole("button", { name: "Start the build" }).click();

	await expect(window.getByTestId("build-failed")).toBeVisible({ timeout: 15_000 });
	await expect(window.getByTestId("build-failed")).toContainText("not in anything you wrote");
	await expect(window.getByTestId("build-progress")).toHaveAttribute("data-outcome", "failed");
	await window.getByRole("button", { name: "Show the compiler output" }).click();
	await saveScreenshot(camera, window, "first-run-build-failed-1100x700");

	await window.getByRole("button", { name: "Build again" }).click();
	await expect(window.getByTestId("build-succeeded")).toBeVisible({ timeout: 15_000 });
});

test("a cancelled first build is calm, and starting again works", async ({ dojo }) =>
{
	const { window } = dojo;

	await useDataSource(window, "fake:fresh", "#/first-run");
	await setViewport(window, 1100, 700);
	await goTo(window, "#/first-run", "screen-firstRun");

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

test("a first build whose progress and answer never arrive still reaches done, through a status check", async ({ dojo, camera }) =>
{
	test.setTimeout(120_000);

	const { window } = dojo;

	await useDataSource(window, "fake:first-build-goes-quiet", "#/first-run");
	await setViewport(window, 1100, 700);
	await goTo(window, "#/first-run", "screen-firstRun");

	await window.getByRole("button", { name: "Use this engine" }).click();
	await window.getByRole("button", { name: "Choose a folder" }).click();
	await window.getByRole("button", { name: "Use this folder" }).click();
	await window.getByRole("button", { name: "Start the build" }).click();

	// The window's own clock keeps moving after the events stop, so it never sits at 0:00 (A822).
	await expect(window.getByTestId("build-elapsed")).not.toHaveText("0:00", { timeout: 5_000 });

	// After 15 s with no new output the screen checks with main on its own; main says the build is still running, so the notice stays up
	// and says so, instead of flashing away (A822).
	await expect(window.locator('[data-testid="quiet-build"][data-confirmed="true"]')).toBeVisible({ timeout: 25_000 });
	await expect(window.getByTestId("quiet-build")).toContainText("Still running; no new output");
	await window.waitForTimeout(3_000);
	await expect(window.locator('[data-testid="quiet-build"][data-confirmed="true"]')).toBeVisible();
	await saveScreenshot(camera, window, "first-run-build-quiet-1100x700");

	// The build ends without sending its answer; the next status check finds it finished.
	await expect(window.getByTestId("build-succeeded")).toBeVisible({ timeout: 40_000 });
	await expect(window.getByTestId("app-error")).toHaveCount(0);
	await saveScreenshot(camera, window, "first-run-build-recovered-1100x700");
});

test("against the real bridge, the title works and the Studio shows real data or the AppError view", async ({ dojo, camera }) =>
{
	const { window } = dojo;

	await useDataSource(window, "bridge");
	await setViewport(window, 1100, 700);

	await expect(window.getByRole("heading", { name: "Unreal Dojo" })).toBeVisible();
	await expect(window.getByTestId("app-version")).not.toBeEmpty();
	await expect(window.getByTestId("fake-data-badge")).toHaveCount(0);

	// Services land one by one (progress and rules are real since M1.6), so the Studio shows either its panels or the plain-English
	// error view for whatever is still missing, never a blank or crashed screen.
	await window.evaluate(`location.hash = "#/studio"`);
	await expect(window.getByTestId("screen-studio")).toBeVisible();
	await expect(window.getByTestId("app-error").or(window.getByTestId("studio-lead")).first()).toBeVisible({ timeout: REAL_BRIDGE_STUDIO_TIMEOUT_MS });

	// A read main never answered also ends in the error view now (A1250). That is the CI hang W12 could not explain, so it still fails
	// here, and the failure attaches main's console, which names the call (A1252, A1253).
	await expect(window.locator('[data-testid="app-error"][data-error-code="no-answer"]')).toHaveCount(0);
	await saveScreenshot(camera, window, "studio-bridge-1100x700");
});

test("a Studio read that main never answers ends in the AppError view, and Try again loads the Studio (W12, A1250)", async ({ dojo, camera }) =>
{
	test.setTimeout(100_000);

	const { window, electronApp } = dojo;

	await useDataSource(window, "bridge");
	await setViewport(window, 1100, 700);
	await expect(window.getByRole("heading", { name: "Unreal Dojo" })).toBeVisible();

	// Main's first answer to getDailyQuest never comes, as on the CI runs that hung (W12); later calls go to the real handler.
	await stubFirstAnswerNeverComes(electronApp, "dojo:getDailyQuest");

	await window.evaluate(`location.hash = "#/studio"`);
	await expect(window.getByTestId("screen-studio")).toBeVisible();
	await expect(window.getByTestId("studio-lead")).toHaveCount(0);

	// The data wait limit is 45 s (A1262); the view must come soon after it, never an endless loading block.
	const noAnswer = window.locator('[data-testid="app-error"][data-error-code="no-answer"]');
	await expect(noAnswer).toBeVisible({ timeout: 60_000 });
	await expect(noAnswer).toContainText("taking too long");
	await expect(window.getByTestId("screen-studio").getByTestId("loading")).toHaveCount(0);
	await saveScreenshot(camera, window, "studio-no-answer-1100x700");

	await noAnswer.getByRole("button", { name: "Try again" }).click();
	await expect(window.getByTestId("studio-lead")).toBeVisible({ timeout: 10_000 });
	await expect(window.getByTestId("app-error")).toHaveCount(0);
});
