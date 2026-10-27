// M5.1h: the Build screen explains a failure that is not the learner's code (scenario "quests", the fake engine's outside-failure marker line).
// A Run shows the "Not your code" view with its action and details; a Submit rejected for the same reason shows the error and no loot, XP or spree change;
// an ordinary compile failure still says "did not compile". Screenshots at 1100x700 and 1440x900, and no sideways scroll at either size.
// Each test gets a freshly launched app with its own userData. With SAVE_PROOF=1 a passing test's pictures are copied to docs/iterations/m5-1h-*.jpg.
// Page scripts are passed as strings because e2e is typechecked without the DOM library.
import type { Page } from "@playwright/test";

import { expect, test } from "./support/dojoTest";
import type { ProofCamera } from "./support/ProofCamera";

/** The comment line the fake engine treats as "Live Coding is active in the open editor". */
const OUTSIDE_FAILURE_MARKER = "// dojo:fake-outside-failure";

/** The quest the flow builds: two files, no explanation gate. */
const QUEST_ID = "f1-score-keeper";

/** The two sizes every screen must work at. */
const SIZES = [
	{ width: 1100, height: 700 },
	{ width: 1440, height: 900 },
] as const;

let window: Page;
let camera: ProofCamera;

/** Screenshots the page into test-results/; a passing test with SAVE_PROOF=1 gets it as a JPG in docs/iterations/. */
async function saveScreenshot(name: string): Promise<void>
{
	await camera.capture(window, `m5-1h-${name}.png`, { proofFileName: `m5-1h-${name}.jpg`, proofFormat: "jpeg" });
}

/** Forces the page to render at an exact size, independent of how large the OS lets the window be. */
async function setViewport(width: number, height: number): Promise<void>
{
	const session = await window.context().newCDPSession(window);

	await session.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
}

/** Switches to a fresh fake in the "quests" scenario and opens a route hash. */
async function openFake(hash: string): Promise<void>
{
	await window.evaluate(`localStorage.setItem("dojo.dataSource", "fake:quests"); location.hash = ${JSON.stringify(hash)}`);
	await window.reload();
	await window.waitForLoadState("domcontentloaded");
	await window.evaluate("document.fonts.ready.then(() => true)");
}

/** Fails when the stage, or any side column inside it, scrolls sideways. */
async function expectNoSidewaysScroll(label: string): Promise<void>
{
	const overflowing = await window.evaluate<string[]>("(() => { const stage = document.querySelector('main'); if (!stage) return ['no stage']; return [stage, ...stage.querySelectorAll('aside')].filter((box) => box.scrollWidth > box.clientWidth + 1).map((box) => (box.getAttribute('aria-label') ?? box.tagName) + ' ' + box.scrollWidth + '>' + box.clientWidth); })()");

	expect(overflowing, label).toEqual([]);
}

/** Opens the quest and waits for Monaco to draw its lines. */
async function openQuest(): Promise<void>
{
	await openFake(`#/quest?id=${QUEST_ID}`);
	await expect(window.getByTestId("build-quest")).toBeVisible();
	await expect(window.getByTestId("build-quest").locator(".monaco-editor .view-lines")).toBeVisible({ timeout: 15_000 });
}

/** Moves the Monaco cursor to the start of the file: Cmd+Up on macOS, Ctrl+Home elsewhere (Ctrl+Home does nothing in Monaco on a Mac, A1263). */
const JUMP_TO_FILE_START_KEY = process.platform === "darwin" ? "Meta+ArrowUp" : "Control+Home";

/** The text of the editor's first line, found as the rendered line drawn at the top (Monaco draws only the visible lines, in no fixed DOM order). */
async function readFirstEditorLine(): Promise<string>
{
	return window.evaluate<string>("(() => { const lines = [...document.querySelectorAll('[data-testid=build-quest] .monaco-editor .view-lines .view-line')]; const top = lines.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0]; return top ? top.textContent ?? '' : ''; })()");
}

/** Puts a line at the very top of the open file as one input, so auto-closed brackets never change it, and checks it landed on the first line. */
async function insertAtTop(line: string): Promise<void>
{
	await window.getByTestId("build-quest").locator(".monaco-editor .view-lines").click();
	await window.keyboard.press(JUMP_TO_FILE_START_KEY);
	await window.keyboard.insertText(`${line}\n`);
	await window.evaluate("new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
	await expect(window.getByTestId("build-quest").locator(".monaco-editor .view-lines")).toContainText(line.slice(0, 12));

	// Monaco shows a non-breaking space for a space, so compare with plain spaces.
	expect((await readFirstEditorLine()).replace(/ /g, " "), "the line should be the first line of the file").toBe(line);
}

/** Scrolls the run column so the first error box starts just under the sticky Run and Submit buttons, so a picture shows its headline. */
async function scrollErrorBelowButtons(): Promise<void>
{
	await window.evaluate("(() => { const column = document.querySelector('[data-testid=run-column]'); const box = column.querySelector('[data-testid=app-error]'); const sticky = column.firstElementChild; const aside = column.closest('aside'); aside.scrollTop += box.getBoundingClientRect().top - sticky.getBoundingClientRect().bottom - 8; })()");
}

/** The text of the Character screen's spree meter and XP, to compare before and after. */
async function readStanding(): Promise<string>
{
	await window.evaluate(`location.hash = "#/character"`);
	await expect(window.getByTestId("spree-meter")).toBeVisible();

	return window.evaluate<string>("document.querySelector('[data-testid=screen-character]').innerText");
}

// Every test drives its own freshly launched app; reduced motion zeroes every duration token, so screenshots never catch a transition.
test.beforeEach(async ({ dojo, camera: testCamera }) =>
{
	window = dojo.window;
	camera = testCamera;
	await window.emulateMedia({ reducedMotion: "reduce" });
});

for (const size of SIZES)
{
	test(`at ${size.width}x${size.height} an outside failure says Not your code on Run, and a Submit shows the error with no loot, XP or spree change`, async () =>
	{
		await setViewport(size.width, size.height);
		await openFake("#/character");

		const standingBefore = await readStanding();

		await openQuest();
		await insertAtTop(OUTSIDE_FAILURE_MARKER);

		// Run: the build never reached the learner's code, and the view says so with its action and details.
		await window.getByTestId("run-button").click();
		await expect(window.getByTestId("run-result")).toBeVisible({ timeout: 20_000 });
		await expect(window.getByTestId("run-result")).toContainText("could not build (not your code)");
		await expect(window.getByTestId("run-result")).not.toContainText("did not compile");
		await expect(window.getByTestId("run-result")).toHaveAttribute("data-ok", "false");

		const runError = window.getByTestId("run-result").getByTestId("app-error");

		await expect(runError).toHaveAttribute("data-error-code", "build-environment-failed");
		await expect(runError.getByTestId("app-error-headline")).toHaveText("Not your code");
		await expect(runError).toContainText("Live Coding is active");
		await expect(runError).toContainText("Close the Unreal Editor");
		await runError.getByRole("button", { name: "Show details" }).click();
		await expect(runError.locator("pre")).toContainText("Unable to build while Live Coding is active");
		await expect(window.locator('[data-testid="test-row"]')).toHaveCount(0);
		await expectNoSidewaysScroll("after Run");
		await scrollErrorBelowButtons();
		await saveScreenshot(`outside-run-${size.width}`);

		// Submit: rejected, so the error shows in place of the loot screen and nothing is recorded.
		await window.getByTestId("submit-button").click();
		await expect(window.getByTestId("run-column").getByTestId("app-error")).toContainText("Close the Unreal Editor", { timeout: 20_000 });
		await expect(window.getByTestId("submit-button")).toBeEnabled();

		const submitError = window.getByTestId("run-column").getByTestId("app-error");

		await expect(submitError).toHaveCount(1);
		await expect(submitError.getByTestId("app-error-headline")).toHaveText("Not your code");
		await expect(submitError.getByRole("button", { name: "Submit again" })).toBeVisible();
		await expect(window.getByTestId("build-quest")).toBeVisible();
		await expect(window.getByTestId("screen-loot")).toHaveCount(0);
		await expect(window.getByTestId("last-submit")).toHaveCount(0);
		await expect(window.getByTestId("failed-submit-offers")).toHaveCount(0);
		await expectNoSidewaysScroll("after Submit");
		await submitError.getByRole("button", { name: "Show details" }).click();
		await expect(submitError.locator("pre")).toContainText("Live Coding");
		await scrollErrorBelowButtons();
		await saveScreenshot(`outside-submit-${size.width}`);

		expect(await readStanding()).toBe(standingBefore);
	});
}

test("an ordinary compile failure still says did not compile, with no Not your code view", async () =>
{
	await setViewport(SIZES[0].width, SIZES[0].height);
	await openQuest();
	await insertAtTop("{");

	await window.getByTestId("run-button").click();
	await expect(window.getByTestId("run-result")).toContainText("did not compile", { timeout: 20_000 });
	await expect(window.getByTestId("run-result")).not.toContainText("not your code");
	await expect(window.getByTestId("app-error")).toHaveCount(0);
	await expect(window.getByTestId("build-log")).toContainText("error");
	await expectNoSidewaysScroll("after a compile failure");
	await saveScreenshot("compile-failure-1100");
});
