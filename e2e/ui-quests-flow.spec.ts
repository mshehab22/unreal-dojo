// ui-quests M2.2: the quest screens against the typed fake (scenario "quests", real Pack 1 World 1 content): a concept quest with predict and
// questions, a drill with every item type, a breakdown submitted and revised, a build that fails, takes a hint, then passes, the loot screen,
// the Parsons fallback after two failed submits, and every quest screen at 1100x700 and 1440x900 without sideways scroll.
// Page scripts are passed as strings because e2e is typechecked without the DOM library.
// Saves screenshots to test-results/; SAVE_PROOF=1 also writes them to docs/iterations/m2-2-*.jpg at one pixel per CSS pixel (1280 wide).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { _electron as electron, expect, test, type ElectronApplication, type Locator, type Page, type TestInfo } from "@playwright/test";

/** The real World 1 the fake serves, read for answers the flow types (Parsons lines, the explain model answer). */
const WORLD_ONE = JSON.parse(readFileSync(resolve("src/renderer/src/data/fake/fixtures/worldOneFixture.json"), "utf8")) as {
	world: { quests: { id: string; kind: string; parsons?: { id: string; lines: string[] }[]; questions?: { type: string; modelAnswer?: string }[] }[] };
};

/** The proof picture size: 1280 wide, as the task asks. */
const PROOF_SIZE = { width: 1280, height: 800 } as const;

/** The two sizes every screen must work at. */
const SIZES = [
	{ width: 1100, height: 700 },
	{ width: 1440, height: 900 },
] as const;

const SHORTCUT_MODIFIER = process.platform === "darwin" ? "Meta" : "Control";

let electronApp: ElectronApplication;
let window: Page;

/** Screenshots the page into test-results/, and as a JPG at CSS pixel size into docs/iterations/ when SAVE_PROOF=1. */
async function saveScreenshot(testInfo: TestInfo, name: string): Promise<void>
{
	await window.screenshot({ path: testInfo.outputPath(`m2-2-${name}.png`) });

	if (process.env["SAVE_PROOF"] === "1") await window.screenshot({ path: resolve(`docs/iterations/m2-2-${name}.jpg`), type: "jpeg", quality: 80, scale: "css" });
}

/** Forces the page to render at an exact size, independent of how large the OS lets the window be (A90). */
async function setViewport(width: number, height: number): Promise<void>
{
	const session = await window.context().newCDPSession(window);

	await session.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
}

/** Switches to a fresh fake in the given scenario and opens a route hash. */
async function openFake(hash: string, scenario = "quests"): Promise<void>
{
	await window.evaluate(`localStorage.setItem("dojo.dataSource", "fake:${scenario}"); location.hash = ${JSON.stringify(hash)}`);
	await window.reload();
	await window.waitForLoadState("domcontentloaded");
	await window.evaluate("document.fonts.ready.then(() => true)");
}

/** Fails when the stage scrolls sideways. */
async function expectNoSidewaysScroll(label: string): Promise<void>
{
	const overflows = await window.evaluate<boolean>("(() => { const stage = document.querySelector('main'); return stage ? stage.scrollWidth > stage.clientWidth : true; })()");

	expect(overflows, label).toBe(false);
}

/** The World 1 quest with this id. */
function worldOneQuest(questId: string): (typeof WORLD_ONE.world.quests)[number]
{
	const quest = WORLD_ONE.world.quests.find((candidate) => candidate.id === questId);

	if (!quest) throw new Error(`World 1 has no quest ${questId}`);

	return quest;
}

/** Waits until Monaco has drawn its lines inside a locator. */
async function waitForEditor(scope: Locator): Promise<void>
{
	await expect(scope.locator(".monaco-editor .view-lines")).toBeVisible({ timeout: 15_000 });
}

/** Finds `text` in the focused Monaco editor with its find widget, then leaves the match selected. */
async function selectInEditor(editor: Locator, text: string): Promise<void>
{
	await editor.locator(".view-lines").click();
	await window.keyboard.press(`${SHORTCUT_MODIFIER}+f`);
	await expect(editor.locator(".find-widget.visible textarea, .find-widget.visible input").first()).toBeFocused();
	await window.keyboard.press(`${SHORTCUT_MODIFIER}+a`);
	await window.keyboard.insertText(text);
	await window.keyboard.press("Enter");
	await window.keyboard.press("Escape");
	await expect(editor.locator(".find-widget.visible")).toHaveCount(0);
}

/** Inserts text into the focused editor as one input, so auto-closed brackets and the completion list never change it. Monaco indents each new line itself. */
async function typeInEditor(text: string): Promise<void>
{
	await window.keyboard.insertText(text);
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

test("a concept quest: predict, the card with hover terms and the example, questions, results, loot", async ({}, testInfo) =>
{
	await setViewport(PROOF_SIZE.width, PROOF_SIZE.height);
	await openFake("#/quest?id=f1-uobject-and-actor");

	const concept = window.getByTestId("concept-quest");
	await expect(concept).toBeVisible();

	// Predict: a guess, locked in, then the answer and why.
	const predict = window.getByTestId("predict-step");
	await predict.getByTestId("choice").filter({ hasText: "constructors only run when an actor is spawned" }).click();
	await saveScreenshot(testInfo, "concept-predict");
	await predict.getByRole("button", { name: "Lock in my guess" }).click();
	await expect(window.getByTestId("predict-reveal")).toBeVisible();
	await expect(predict.locator('[data-testid="choice"][data-right="true"]')).toContainText("template object");
	await predict.getByRole("button", { name: "Read the card" }).click();

	// The card: a glossary term shows its hover card; the example checks its syntax.
	const card = window.getByTestId("card-step");
	await waitForEditor(card);
	const term = card.getByTestId("glossary-term").first();
	await expect(async () =>
	{
		await window.mouse.move(5, 5);
		await term.hover();
		await expect(window.getByTestId("term-card")).toBeVisible({ timeout: 1_500 });
	}).toPass({ timeout: 10_000 });
	await saveScreenshot(testInfo, "concept-card-hover-term");
	await window.mouse.move(5, 5);
	await card.getByRole("button", { name: "Check syntax" }).click();
	await expect(window.getByTestId("syntax-result")).toHaveAttribute("data-ok", "true");
	await card.getByRole("button", { name: "Answer the questions" }).click();

	// Questions: each type answered by keyboard or click, then graded together.
	const questions = window.getByTestId("concept-question");
	await expect(questions).toHaveCount(4);
	await questions.nth(0).getByTestId("choice").filter({ hasText: "A recipe" }).click();
	await questions.nth(1).getByTestId("fill-blank-input").fill("A");
	await questions.nth(2).getByTestId("bug-line").nth(3).click();
	const explainAnswer = worldOneQuest("f1-uobject-and-actor").questions?.find((question) => question.type === "explain-in-one-sentence")?.modelAnswer ?? "";
	await questions.nth(3).getByTestId("explain-input").fill(explainAnswer);
	await window.getByRole("button", { name: "Submit answers" }).click();

	await expect(window.getByTestId("question-feedback")).toHaveCount(4);
	await expect(window.locator('[data-testid="question-feedback"][data-correct="true"]')).toHaveCount(4);
	await expect(window.getByTestId("model-answer")).toBeVisible();
	await window.getByTestId("concept-result").scrollIntoViewIfNeeded();
	await saveScreenshot(testInfo, "concept-results");

	// Loot.
	await window.getByRole("button", { name: "See your loot" }).click();
	await expect(window.getByTestId("screen-loot")).toHaveAttribute("data-passed", "true");
	await expect(window.getByTestId("loot-score")).toHaveAttribute("data-score", "100");
	await expect(window.getByTestId("xp-total")).toContainText("XP");
	await saveScreenshot(testInfo, "concept-loot");

	// Next goes to the next quest in the world.
	await window.getByTestId("loot-next").click();
	await expect(window.getByTestId("screen-quest")).toHaveAttribute("data-quest", "f1-reflection-and-uclass");
});

test("a drill with every item type, Parsons distractors marked, and the finish card", async ({}, testInfo) =>
{
	await setViewport(PROOF_SIZE.width, PROOF_SIZE.height);
	await openFake("#/studio");
	await window.getByTestId("start-drill").click();

	const screen = window.getByTestId("screen-drill");
	await expect(screen).toBeVisible();
	await expect(window.getByTestId("drill-position")).toContainText("1 / 7");

	const dummy = worldOneQuest("f1-training-dummy");
	const strikeLines = dummy.parsons?.[0]?.lines ?? [];
	const explainModel = worldOneQuest("f1-ufunction-specifiers").questions?.find((question) => question.type === "explain-in-one-sentence")?.modelAnswer ?? "";
	const seen = new Set<string>();

	for (let index = 0; index < 7; index++)
	{
		const item = window.getByTestId("drill-item");
		const source = await item.getAttribute("data-source");
		const type = source === "parsons" ? "parsons" : await item.getByTestId("question").getAttribute("data-type");
		seen.add(type ?? "unknown");

		if (type === "parsons")
		{
			// Place the distractor first, then the real lines in order: the check marks the distractor with its mistake.
			await item.locator('[data-testid="parsons-pool-line"][data-line-id^="distractor-"]').first().click();

			for (let line = 0; line < strikeLines.length; line++) await item.locator(`[data-testid="parsons-pool-line"][data-line-id="line-${line}"]`).click();

			// Keyboard: move the distractor down one with Alt+Down.
			await item.locator('[data-testid="parsons-placed-line"]').first().focus();
			await window.keyboard.press("Alt+ArrowDown");
		}
		else if (type === "multiple-choice" || type === "which-pattern")
		{
			// Keyboard: focus the first choice and pick it with Space.
			await item.getByTestId("choice").first().locator("input").focus();
			await window.keyboard.press("Space");
		}
		else if (type === "fill-blank")
		{
			await item.getByTestId("fill-blank-input").fill("GENERATED_BODY");
		}
		else if (type === "spot-the-bug")
		{
			await item.getByTestId("bug-line").nth(3).click();
		}
		else if (type === "explain-in-one-sentence")
		{
			await item.getByTestId("explain-input").fill(explainModel);
		}

		await window.keyboard.press(`${SHORTCUT_MODIFIER}+Enter`);
		await expect(item.getByTestId("question-feedback")).toBeVisible();

		if (type === "parsons")
		{
			await expect(item.locator('[data-testid="parsons-placed-line"][data-wrong="true"]').first()).toBeVisible();
			await saveScreenshot(testInfo, "drill-parsons-marked");
		}

		if (type === "which-pattern") await saveScreenshot(testInfo, "drill-pattern-discrimination");
		if (type === "explain-in-one-sentence") await saveScreenshot(testInfo, "drill-explain-graded");
		if (type === "spot-the-bug") await saveScreenshot(testInfo, "drill-spot-the-bug");

		await window.getByRole("button", { name: index === 6 ? "Finish the drill" : "Next" }).click();
	}

	expect([...seen].sort()).toEqual(["explain-in-one-sentence", "fill-blank", "multiple-choice", "parsons", "spot-the-bug", "which-pattern"]);

	const summary = window.getByTestId("drill-summary");
	await expect(summary).toBeVisible();
	await expect(summary).toContainText("Next item due");
	await expect(summary).toContainText("streak kept");
	await saveScreenshot(testInfo, "drill-summary");
});

test("a breakdown: plan on the board, submit, compare with a reference, revise with a note, graded loot", async ({}, testInfo) =>
{
	await setViewport(PROOF_SIZE.width, PROOF_SIZE.height);
	await openFake("#/quest?id=f1-dash-with-cooldown");

	const workspace = window.getByTestId("breakdown-quest");
	await expect(workspace).toHaveAttribute("data-step", "plan");

	// No pattern names before the reference reveal (A64), and no hints while planning.
	await expect(window.getByTestId("pattern-chips")).toHaveCount(0);
	await expect(window.getByTestId("hint-spells")).toHaveCount(0);

	const pieces: { kind: string; label: string; purpose: string }[] = [
		{ kind: "step", label: "Bind the dash input action", purpose: "A press of the dash button calls the dash" },
		{ kind: "component", label: "DashComponent", purpose: "Performs the dash: launches the character along the flattened camera direction" },
		{ kind: "component", label: "CooldownComponent", purpose: "Reusable cooldown that can start and answer whether it is ready" },
		{ kind: "event", label: "OnDashStarted and OnCooldownReady", purpose: "The HUD listens to these events instead of polling" },
		{ kind: "data", label: "Dash tunables", purpose: "Distance, lock time, and cooldown as EditAnywhere values" },
	];

	// The keyboard path: add buttons, then type the name and purpose.
	for (const piece of pieces)
	{
		await window.getByTestId(`add-piece-${piece.kind}`).click();
		await window.getByTestId("piece-label").fill(piece.label);
		await window.getByTestId("piece-purpose").fill(piece.purpose);
	}

	await expect(window.getByTestId("piece-node")).toHaveCount(5);

	// An arrow from the form: the dash component owns... the cooldown.
	const arrows = window.getByTestId("arrow-panel");
	await arrows.getByLabel("Arrow from").selectOption({ label: "DashComponent" });
	await arrows.getByLabel("Arrow meaning").selectOption("owns");
	await arrows.getByLabel("Arrow to").selectOption({ label: "CooldownComponent" });
	await arrows.getByRole("button", { name: "Add arrow" }).click();
	await expect(window.getByTestId("arrow-item")).toHaveCount(1);
	await saveScreenshot(testInfo, "breakdown-plan");

	await window.getByTestId("submit-plan").click();
	await expect(workspace).toHaveAttribute("data-step", "compare");
	await expect(window.getByTestId("reference-board").getByTestId("piece-node").first()).toBeVisible();
	await expect(window.getByTestId("pattern-chips")).toBeVisible();

	// Revise: add the missing pieces the reference shows, then say why.
	await window.getByTestId("add-piece-step").click();
	await window.getByTestId("piece-label").fill("Lock movement input");
	await window.getByTestId("piece-purpose").fill("Ignore movement input for the lock window so the dash cannot be steered");
	await window.getByTestId("add-piece-step").click();
	await window.getByTestId("piece-label").fill("Wall stop");
	await window.getByTestId("piece-purpose").fill("Stop the dash on a blocking hit so it never slides along a wall");
	await window.getByTestId("add-piece-class").click();
	await window.getByTestId("piece-label").fill("HUD cooldown wedge");
	await window.getByTestId("piece-purpose").fill("Widget that listens to the events and refills while the cooldown runs");
	await window.getByTestId("revision-note").fill("The reference made me add the movement lock and the wall stop as their own steps, and a HUD wedge that listens to the events.");
	await saveScreenshot(testInfo, "breakdown-compare");

	await window.getByTestId("grade-revision").click();
	await expect(window.getByTestId("screen-loot")).toBeVisible();
	await expect(window.getByTestId("breakdown-grade")).toBeVisible();
	await expect(window.locator('[data-testid="required-pieces"] li[data-covered="true"]')).not.toHaveCount(0);
	await saveScreenshot(testInfo, "breakdown-loot");
	await window.getByTestId("breakdown-grade").scrollIntoViewIfNeeded();
	await saveScreenshot(testInfo, "breakdown-loot-grade");
});

test("a build: explain the marked lines, Run fails, a hint, fix, Run passes, Submit with a review retry, loot, see it run", async ({}, testInfo) =>
{
	await setViewport(PROOF_SIZE.width, PROOF_SIZE.height);

	// Choosing Claude Code makes the fake's first review time out into tests-only, to prove Retry review (A300).
	await openFake("#/settings");
	await window.getByRole("radiogroup", { name: "Review provider" }).getByRole("radio", { name: "Claude Code" }).click();
	await expect(window.getByRole("radiogroup", { name: "Review provider" }).getByRole("radio", { name: "Claude Code" })).toHaveAttribute("aria-checked", "true");
	await window.evaluate(`location.hash = "#/quest?id=f1-training-dummy"`);

	const build = window.getByTestId("build-quest");
	await expect(build).toBeVisible();
	await waitForEditor(build);

	// Below 1400 wide the brief starts folded so the editor has room; the toggle opens it.
	await window.getByTestId("toggle-brief").click();
	await expect(window.getByTestId("scaffold-badge")).toHaveAttribute("data-scaffold", "worked");

	// Pattern chips stay hidden before the pass (A64); the quest has none anyway, so check the brief shows no pattern block.
	await expect(window.getByTestId("pattern-chips")).toHaveCount(0);

	// The gate: Submit waits until every marked line is explained.
	await expect(window.getByTestId("submit-button")).toBeDisabled();
	const explanations = window.getByTestId("self-explanation");
	const count = await explanations.count();
	expect(count).toBe(5);

	for (let index = 0; index < count; index++) await explanations.nth(index).fill("This line lets the engine see and use the class safely");

	await saveScreenshot(testInfo, "build-gate");
	await window.getByTestId("open-gaps").click();
	await expect(window.getByTestId("self-explanation-gate")).toHaveAttribute("data-open", "true");
	await saveScreenshot(testInfo, "build-gate-open");
	await window.getByTestId("toggle-reasons").click();

	// Run the starter with the keyboard: it builds, and the reflection test fails.
	await window.getByTestId("brief-column").click();
	await window.keyboard.press(`${SHORTCUT_MODIFIER}+Enter`);
	await expect(window.getByTestId("run-result")).toHaveAttribute("data-ok", "false", { timeout: 20_000 });
	await expect(window.locator('[data-testid="test-row"][data-passed="false"]').first()).toBeVisible();
	await saveScreenshot(testInfo, "build-run-fails");

	// A hint spell.
	await window.getByTestId("reveal-hint").click();
	await expect(window.getByTestId("hint-text")).toHaveCount(1);
	await saveScreenshot(testInfo, "build-hint");

	// Fill both gaps by typing in Monaco.
	const editor = build.getByTestId("code-editor");
	await window.getByTestId("file-tab").filter({ hasText: "DojoF1TrainingDummy.h" }).click();
	await expect(editor.locator(".view-lines")).toContainText("GENERATED_BODY");
	await selectInEditor(editor, "void Strike();");
	await typeInEditor('UFUNCTION(BlueprintCallable, Category = "Dummy")\nvoid Strike();');
	await expect(editor.locator(".view-lines")).toContainText("UFUNCTION(BlueprintCallable");
	await saveScreenshot(testInfo, "build-editing-header");

	await window.getByTestId("file-tab").filter({ hasText: "DojoF1TrainingDummy.cpp" }).click();
	await expect(editor.locator(".view-lines")).toContainText("CreateDefaultSubobject");
	await selectInEditor(editor, "// Your code: do nothing if the dummy is already down; otherwise count the strike and refresh the label.");
	await typeInEditor("if (IsKnockedDown()) return;\nHitsTaken++;\nRefreshLabel();");
	await expect(editor.locator(".view-lines")).toContainText("HitsTaken++;");
	await saveScreenshot(testInfo, "build-editing-source");

	// Run again from inside the editor: every test passes.
	await window.keyboard.press(`${SHORTCUT_MODIFIER}+Enter`);
	await expect(window.getByTestId("run-result")).toHaveAttribute("data-ok", "true", { timeout: 20_000 });
	await expect(window.locator('[data-testid="test-row"][data-passed="false"]')).toHaveCount(0);
	await saveScreenshot(testInfo, "build-run-passes");

	// Submit: the review times out into tests-only with Retry review; the retry gets the mentor's review.
	await window.getByTestId("submit-button").click();
	await expect(window.getByTestId("screen-loot")).toBeVisible({ timeout: 20_000 });
	await expect(window.getByTestId("review-fallback")).toBeVisible();
	await window.getByTestId("retry-review").click();
	await expect(window.getByTestId("code-review")).toHaveAttribute("data-provider", "claude-code", { timeout: 20_000 });
	await expect(window.getByTestId("screen-loot")).toHaveAttribute("data-passed", "true");
	await expect(window.getByTestId("xp-total")).not.toHaveText("0 XP");

	// Findings explain themselves for free; the reflection takes one sentence.
	await window.getByTestId("finding-why").first().click();
	await expect(window.getByTestId("finding-explanation")).toBeVisible();
	await window.getByTestId("reflection").getByRole("textbox").fill("Designers tune the strikes in the Details panel because the function and property are reflected.");
	await window.getByTestId("reflection").getByRole("button", { name: "Send my answer" }).click();
	await expect(window.getByTestId("reflection-grade")).toBeVisible();
	await expect(window.getByTestId("loot-alternative")).toBeVisible();
	await window.evaluate("document.querySelector('main').scrollTo({ top: 0 })");
	await saveScreenshot(testInfo, "build-loot");
	await window.getByTestId("code-review").scrollIntoViewIfNeeded();
	await saveScreenshot(testInfo, "build-loot-review");

	await window.getByTestId("see-it-run").click();
	await expect(window.getByTestId("see-it-run")).toBeEnabled();

	// Improve returns to the quest with the last submit kept.
	await window.getByTestId("loot-improve").click();
	await expect(window.getByTestId("last-submit")).toHaveAttribute("data-passed", "true");
});

test("two failed submits offer the Parsons fallback, which opens a one-item drill", async ({}, testInfo) =>
{
	await setViewport(PROOF_SIZE.width, PROOF_SIZE.height);
	await openFake("#/quest?id=f1-score-keeper");

	const build = window.getByTestId("build-quest");
	await waitForEditor(build);

	for (let attempt = 0; attempt < 2; attempt++)
	{
		await window.getByTestId("submit-button").click();
		await expect(window.getByTestId("screen-loot")).toHaveAttribute("data-passed", "false", { timeout: 20_000 });
		await window.getByTestId("loot-improve").click();
		await waitForEditor(window.getByTestId("build-quest"));
	}

	await expect(window.getByTestId("failed-submit-offers")).toBeVisible();
	await expect(async () =>
	{
		await window.mouse.move(5, 5);
		await window.getByTestId("seer-stone-offer").hover();
		await expect(window.getByRole("tooltip")).toContainText("Seer Stone", { timeout: 1_500 });
	}).toPass({ timeout: 10_000 });
	await saveScreenshot(testInfo, "build-failed-submit-offers");

	await window.getByTestId("parsons-fallback").click();
	await expect(window.getByTestId("screen-drill")).toHaveAttribute("data-kind", "parsons-fallback");
	await expect(window.getByTestId("drill-position")).toContainText("1 / 1");
	await expect(window.getByTestId("parsons")).toBeVisible();
});

test("every quest screen fits at 1100x700 and 1440x900 without sideways scroll", async ({}, testInfo) =>
{
	const routes = [
		{ hash: "#/quest?id=f1-uproperty-specifiers", ready: "predict-step", file: "concept" },
		{ hash: "#/quest?id=f1-popup-target", ready: "editor-column", file: "build" },
		{ hash: "#/quest?id=f1-dash-with-cooldown", ready: "learner-board", file: "breakdown" },
		{ hash: "#/drill?kind=due", ready: "drill-item", file: "drill" },
	] as const;

	for (const size of SIZES)
	{
		await setViewport(size.width, size.height);

		for (const route of routes)
		{
			await openFake(route.hash);
			await expect(window.getByTestId(route.ready)).toBeVisible();
			await expect(window.getByTestId("app-error")).toHaveCount(0);
			await expect(window.getByRole("heading", { level: 1 })).toHaveCount(1);

			if (route.file === "build") await waitForEditor(window.getByTestId("build-quest"));

			await expectNoSidewaysScroll(`${route.file} at ${size.width}x${size.height}`);
			await saveScreenshot(testInfo, `${route.file}-${size.width}x${size.height}`);
		}
	}
});
