// M3.3 economy flows against the typed fake (scenario "economy", real Pack 1 World 1 content, A1399): the daily quest picked, started, finished, and its chest
// opened with the 7 day streak celebration; the spree at stake on a build, armor absorbing a missed first try, and the Seer Stone flow after two failed submits;
// a world's test-out drill and its skippable stages on the map. Each test gets a freshly launched, hidden app (A77). With SAVE_PROOF=1 a passing test's
// pictures are copied to docs/iterations/m3-3-*.jpg at one pixel per CSS pixel. Page scripts are strings because e2e is typechecked without the DOM library.
import type { Locator, Page } from "@playwright/test";

import { answerParsons, answerQuestion, readAnswerKey, type AnswerKey } from "./support/answerKey";
import { expect, test } from "./support/dojoTest";
import type { ProofCamera } from "./support/ProofCamera";

/** The proof picture size. */
const PROOF_SIZE = { width: 1280, height: 800 } as const;

let window: Page;
let camera: ProofCamera;
let answers: AnswerKey;

/** Screenshots the page into test-results/; a passing test with SAVE_PROOF=1 gets it as a JPG in docs/iterations/. */
async function saveScreenshot(name: string): Promise<void>
{
	await camera.capture(window, `m3-3-${name}.png`, { proofFileName: `m3-3-${name}.jpg`, proofFormat: "jpeg" });
}

/** Forces the page to render at an exact size, independent of how large the OS lets the window be (A90). */
async function setViewport(width: number, height: number): Promise<void>
{
	const session = await window.context().newCDPSession(window);

	await session.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
}

/** Switches to a fresh fake in the economy scenario and opens a route hash. */
async function openEconomy(hash: string): Promise<void>
{
	await window.evaluate(`localStorage.setItem("dojo.dataSource", "fake:economy"); location.hash = ${JSON.stringify(hash)}`);
	await window.reload();
	await window.waitForLoadState("domcontentloaded");
	await window.evaluate("document.fonts.ready.then(() => true)");
}

/** Waits until Monaco has drawn its lines inside a locator. */
async function waitForEditor(scope: Locator): Promise<void>
{
	await expect(scope.locator(".monaco-editor .view-lines")).toBeVisible({ timeout: 15_000 });
}

/** Fails when the stage, or any side column inside it, scrolls sideways. */
async function expectNoSidewaysScroll(label: string): Promise<void>
{
	const overflowing = await window.evaluate<string[]>("(() => { const stage = document.querySelector('main'); if (!stage) return ['no stage']; return [stage, ...stage.querySelectorAll('aside')].filter((box) => box.scrollWidth > box.clientWidth + 1).map((box) => (box.getAttribute('aria-label') ?? box.tagName) + ' ' + box.scrollWidth + '>' + box.clientWidth); })()");

	expect(overflowing, label).toEqual([]);
}

/** Answers every item of the drill on screen right from the content's answer key, then finishes it. */
async function answerWholeDrill(): Promise<void>
{
	await expect(window.getByTestId("drill-position")).toContainText("1 /");
	const total = Number((await window.getByTestId("drill-position").textContent())?.split("/")[1]?.trim() ?? "0");

	for (let index = 0; index < total; index++)
	{
		const item = window.getByTestId("drill-item");

		await expect(window.getByTestId("drill-position")).toContainText(`${index + 1} /`);
		if ((await item.getAttribute("data-source")) === "parsons") await answerParsons(answers, item);
		else await answerQuestion(answers, item.getByTestId("question"));

		await window.getByRole("button", { name: "Check" }).click();
		await window.getByRole("button", { name: index === total - 1 ? "Finish the drill" : "Next" }).click();
	}

	await expect(window.getByTestId("drill-summary")).toBeVisible();
}

// The answer key is built once from content/ for every test.
test.beforeAll(() =>
{
	answers = readAnswerKey();
});

// Every test drives its own freshly launched app; reduced motion zeroes every duration token, so pictures never catch a transition.
test.beforeEach(async ({ dojo, camera: testCamera }) =>
{
	window = dojo.window;
	camera = testCamera;
	await window.emulateMedia({ reducedMotion: "reduce" });
});

test("the daily quest: pick an offer, start it, finish it, open the chest, and celebrate the 7 day streak", async () =>
{
	await setViewport(PROOF_SIZE.width, PROOF_SIZE.height);
	await openEconomy("#/studio");

	// Three offers, none chosen; the chest waits closed and the month so far is counted.
	const daily = window.getByTestId("studio-daily");
	await expect(daily.getByTestId("daily-offer")).toHaveCount(3);
	await expect(daily.getByTestId("chest")).toHaveAttribute("data-open", "false");
	await expect(daily.getByTestId("daily-month")).toContainText("1 of");
	await expect(window.getByTestId("studio-today").getByTestId("spree-meter")).toContainText("4");
	await daily.scrollIntoViewIfNeeded();
	await saveScreenshot("studio-daily-offers");

	// Pick the concept offer; Start opens its quest.
	await daily.getByTestId("daily-offer").nth(1).getByRole("button", { name: "Pick this one" }).click();
	await expect(daily.getByTestId("daily-offer").nth(1)).toHaveAttribute("data-chosen", "true");
	await saveScreenshot("studio-daily-picked");
	await daily.getByTestId("daily-start").click();
	await expect(window.getByTestId("screen-quest")).toHaveAttribute("data-quest", "f1-uobject-and-actor");

	// Pass the concept quest.
	const predict = window.getByTestId("predict-step");
	await answerQuestion(answers, predict.getByTestId("question"));
	await predict.getByRole("button", { name: "Lock in my guess" }).click();
	await predict.getByRole("button", { name: "Read the card" }).click();
	await window.getByTestId("card-step").getByRole("button", { name: "Answer the questions" }).click();
	const questions = window.getByTestId("concept-question");
	for (let index = 0; index < (await questions.count()); index++) await answerQuestion(answers, questions.nth(index).getByTestId("question"));
	await window.getByRole("button", { name: "Submit answers" }).click();
	await window.getByRole("button", { name: "See your loot" }).click();

	// The loot: the 7 day celebration and the chest opened with what it held.
	await expect(window.getByTestId("screen-loot")).toHaveAttribute("data-passed", "true");
	await expect(window.getByTestId("streak-celebration")).toHaveAttribute("data-milestone", "7");
	await expect(window.getByTestId("streak-celebration")).toContainText("Next milestone: 30");
	const reward = window.getByTestId("daily-reward");
	await expect(reward.getByTestId("chest")).toHaveAttribute("data-open", "true");
	await expect(reward.getByTestId("chest-reward")).toHaveText("Seer Stone");
	await reward.scrollIntoViewIfNeeded();
	await saveScreenshot("loot-streak-and-chest");

	// Back in the Studio the day is done and the chest stays open with its reward; the stone is held.
	await window.evaluate(`location.hash = "#/studio"`);
	await expect(daily.getByTestId("daily-done")).toBeVisible();
	await expect(daily.getByTestId("chest")).toHaveAttribute("data-open", "true");
	await expect(daily.getByTestId("chest-reward")).toHaveText("Seer Stone");
	await expect(daily.getByTestId("daily-month")).toContainText("2 of");
	await daily.scrollIntoViewIfNeeded();
	await saveScreenshot("studio-daily-done");
});

test("a build: the spree at stake, armor absorbing a missed first try, and the Seer Stone flow after two failed submits", async () =>
{
	await setViewport(PROOF_SIZE.width, PROOF_SIZE.height);
	await openEconomy("#/quest?id=f1-score-keeper");

	const build = window.getByTestId("build-quest");
	await waitForEditor(build);

	// The first try counts and would turn the bonus on; armor covers a miss.
	const stake = window.getByTestId("spree-stake");
	await expect(stake).toHaveAttribute("data-counts", "true");
	await expect(stake).toContainText("First try counts: spree 4 to 5");
	await expect(stake).toContainText("absorbed by armor (1 held)");
	await saveScreenshot("build-spree-stake");

	// The starter builds and its test fails: armor absorbs the miss, the spree of 4 stands.
	await window.getByTestId("submit-button").click();
	await expect(window.getByTestId("screen-loot")).toHaveAttribute("data-passed", "false", { timeout: 20_000 });
	await expect(window.getByTestId("armor-used")).toContainText("your spree of 4 stands");
	await expect(window.getByTestId("loot-spree")).toHaveAttribute("data-spree", "4");
	await saveScreenshot("loot-armor-absorbed");

	// A second failed submit opens the offers; the first try is spent now.
	await window.getByTestId("loot-improve").click();
	await waitForEditor(window.getByTestId("build-quest"));
	await expect(stake).toHaveAttribute("data-counts", "false");
	await window.getByTestId("submit-button").click();
	await expect(window.getByTestId("screen-loot")).toHaveAttribute("data-passed", "false", { timeout: 20_000 });
	await window.getByTestId("loot-improve").click();
	await waitForEditor(window.getByTestId("build-quest"));
	await expect(window.getByTestId("failed-submit-offers")).toBeVisible();
	await expect(window.getByTestId("seer-stone-offer")).toContainText("1 Seer Stone held");

	// The choice: a stone keeps the XP, or pay with the quest's XP.
	await window.getByTestId("seer-stone-offer").click();
	const dialog = window.getByTestId("seer-stone-dialog");
	await expect(dialog).toBeVisible();
	await expect(dialog.getByTestId("seer-stone-pay-xp")).toBeEnabled();
	await saveScreenshot("seer-stone-choice");

	// Spending the stone shows the solution's files and the rematch it scheduled.
	await dialog.getByTestId("seer-stone-spend").click();
	await expect(dialog.getByTestId("reference-solution")).toBeVisible();
	await expect(dialog.getByTestId("solution-file-tab")).toHaveCount(2);
	await expect(dialog).toContainText("A Seer Stone paid for this view");
	await expect(dialog.getByTestId("solution-rematch")).toContainText("A rematch comes due");
	await expect(dialog.getByTestId("code-block")).toContainText("ScoreKeeper");
	await dialog.getByTestId("solution-file-tab").nth(1).click();
	await saveScreenshot("seer-stone-solution");
	await setViewport(1100, 700);
	await expect(dialog.getByTestId("reference-solution")).toBeVisible();
	await setViewport(PROOF_SIZE.width, PROOF_SIZE.height);

	// Closed and opened again, it is free and shows at once; no stone is left.
	await window.keyboard.press("Escape");
	await expect(dialog).toHaveCount(0);
	await expect(window.getByTestId("seer-stone-offer")).toContainText("Show the solution again (free)");
	await window.getByTestId("seer-stone-offer").click();
	await expect(window.getByTestId("seer-stone-dialog").getByTestId("reference-solution")).toBeVisible();
	await window.keyboard.press("Escape");
	await setViewport(1100, 700);
	await expectNoSidewaysScroll("build with the spree note and the offers at 1100x700");
});

test("a world's test-out drill tests it out, and the map marks its worked and faded builds as skippable", async () =>
{
	// Seven drill items, each graded through the fake's latency, run close to the default minute on a busy machine.
	test.slow();
	await setViewport(PROOF_SIZE.width, PROOF_SIZE.height);
	await openEconomy("#/world-map");

	const card = window.locator('[data-testid="contract-card"][data-world="objects-and-reflection"]');
	await expect(card.getByTestId("test-out")).toBeVisible();
	await expect(card.getByTestId("stage-skippable")).toHaveCount(0);
	await card.getByTestId("test-out").click();

	// The drill names its world and says bosses never skip.
	const screen = window.getByTestId("screen-drill");
	await expect(screen).toHaveAttribute("data-kind", "test-out");
	await expect(screen).toContainText("Bosses are never skipped");
	await answerWholeDrill();

	const result = window.getByTestId("test-out-result");
	await expect(result).toHaveAttribute("data-tested-out", "true");
	await expect(result).toContainText("Tested out of");
	await expect(window.getByTestId("streak-celebration")).toHaveAttribute("data-milestone", "7");
	await saveScreenshot("test-out-summary");

	// Back on the map: the badge counts the skippable stages, which carry the skip mark; the boss does not.
	await window.getByTestId("drill-done").click();
	await expect(card.getByTestId("tested-out-badge")).toContainText("may be skipped");
	await expect(card.getByTestId("test-out")).toHaveCount(0);
	await expect(card.locator('[data-testid="stage-node"][data-skippable="true"]')).toHaveCount(2);
	await expect(card.locator('[data-testid="stage-node"][data-kind="boss"]')).toHaveAttribute("data-skippable", "false");
	await card.scrollIntoViewIfNeeded();
	await saveScreenshot("world-map-skippable");
});
