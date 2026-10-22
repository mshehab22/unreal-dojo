// ui-quests M2.2: the quest screens against the typed fake (scenario "quests", real Pack 1 World 1 content): a concept quest with predict and
// questions, a drill with every item type, a breakdown submitted and revised, a build that fails, takes a hint, then passes, the loot screen,
// the Parsons fallback after two failed submits, and every quest screen at 1100x700 and 1440x900 without sideways scroll.
// Page scripts are passed as strings because e2e is typechecked without the DOM library.
// Each test gets a freshly launched app with its own userData (the QA harness). Screenshots go to test-results/; with SAVE_PROOF=1 a passing
// test's pictures are copied to docs/iterations/m2-2-*.jpg at one pixel per CSS pixel (1280 wide).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { readFakeWorldFixtureJson } from "../tools/fake/readFakeWorldFixture";
import { expect, test } from "./support/dojoTest";
import type { ProofCamera } from "./support/ProofCamera";

/** The real World 1 the fake serves, built from content/ the same way the app's build does (A365), read for answers the flow types (Parsons lines, the explain model answer). */
const WORLD_ONE = JSON.parse(readFakeWorldFixtureJson()) as {
	world: { quests: { id: string; kind: string; parsons?: { id: string; lines: string[] }[]; questions?: { type: string; modelAnswer?: string }[] }[] };
};

/** The pattern the drill's which-pattern item (the State card's first scenario) wants. */
const STATE_SCENARIO_ANSWER = (JSON.parse(readFileSync(resolve("content/patterns.json"), "utf8")) as { id: string; scenarios: { answer?: string }[] }[]).find((card) => card.id === "state")?.scenarios[0]?.answer ?? "state";

/** The proof picture size: 1280 wide, as the task asks. */
const PROOF_SIZE = { width: 1280, height: 800 } as const;

/** The two sizes every screen must work at. */
const SIZES = [
	{ width: 1100, height: 700 },
	{ width: 1440, height: 900 },
] as const;

const SHORTCUT_MODIFIER = process.platform === "darwin" ? "Meta" : "Control";

let window: Page;
let camera: ProofCamera;

/** Screenshots the page into test-results/; a passing test with SAVE_PROOF=1 gets it as a JPG in docs/iterations/. */
async function saveScreenshot(name: string): Promise<void>
{
	await camera.capture(window, `m2-2-${name}.png`, { proofFileName: `m2-2-${name}.jpg`, proofFormat: "jpeg" });
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

/** Fails when the stage, or any side column inside it, scrolls sideways. */
async function expectNoSidewaysScroll(label: string): Promise<void>
{
	const overflowing = await window.evaluate<string[]>("(() => { const stage = document.querySelector('main'); if (!stage) return ['no stage']; return [stage, ...stage.querySelectorAll('aside')].filter((box) => box.scrollWidth > box.clientWidth + 1).map((box) => { const edge = box.getBoundingClientRect().right; const widest = [...box.querySelectorAll('*')].sort((first, second) => second.getBoundingClientRect().right - first.getBoundingClientRect().right)[0]; const culprit = widest && widest.getBoundingClientRect().right > edge ? ' (' + (widest.getAttribute('data-testid') ?? widest.tagName + '.' + String(widest.className).slice(0, 60)) + ')' : ''; return (box.getAttribute('aria-label') ?? box.tagName) + ' ' + box.scrollWidth + '>' + box.clientWidth + culprit; }); })()");

	expect(overflowing, label).toEqual([]);
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

	// Wait until the widget found exactly this text once, so Enter selects it and not a stale match.
	await expect(editor.locator(".find-widget .matchesCount")).toHaveText(/^1 of 1$/);
	await window.keyboard.press("Enter");
	await window.keyboard.press("Escape");
	await expect(editor.locator(".find-widget.visible")).toHaveCount(0);
}

/** The build editor's visible lines in screen order (Monaco reuses line elements, so their order in the page is not the text order). */
async function visibleEditorText(): Promise<string>
{
	return window.evaluate<string>("[...document.querySelectorAll('[data-testid=build-quest] [data-testid=code-editor] .view-line')].sort((first, second) => parseFloat(first.style.top) - parseFloat(second.style.top)).map((line) => line.textContent.replace(/\\u00a0/g, ' ')).join('\\n')");
}

/** The first plan the breakdown flows type: five dash pieces, each with a name and purpose, through the keyboard path (add button, then the fields). */
async function addDashPieces(): Promise<void>
{
	const pieces: { kind: string; label: string; purpose: string }[] = [
		{ kind: "step", label: "Bind the dash input action", purpose: "A press of the dash button calls the dash" },
		{ kind: "component", label: "DashComponent", purpose: "Performs the dash: launches the character along the flattened camera direction" },
		{ kind: "component", label: "CooldownComponent", purpose: "Reusable cooldown that can start and answer whether it is ready" },
		{ kind: "event", label: "OnDashStarted and OnCooldownReady", purpose: "The HUD listens to these events instead of polling" },
		{ kind: "data", label: "Dash tunables", purpose: "Distance, lock time, and cooldown as EditAnywhere values" },
	];

	for (const piece of pieces)
	{
		await window.getByTestId(`add-piece-${piece.kind}`).click();
		await window.getByTestId("piece-label").fill(piece.label);
		await window.getByTestId("piece-purpose").fill(piece.purpose);
	}
}

/** The zoom React Flow settled on for one board, read from its viewport transform. */
async function boardZoom(testId: string): Promise<number>
{
	return window.evaluate<number>(`(() => { const viewport = document.querySelector('[data-testid="${testId}"] .react-flow__viewport'); const match = viewport ? /scale\\(([0-9.]+)\\)/.exec(viewport.style.transform) : null; return match ? Number(match[1]) : 0; })()`);
}

/** Inserts text into the focused editor as one input, so auto-closed brackets and the completion list never change it. Monaco indents each new line itself. */
async function typeInEditor(text: string): Promise<void>
{
	await window.keyboard.insertText(text);
}

// Every test drives its own freshly launched app; reduced motion zeroes every duration token, so screenshots never catch a transition.
test.beforeEach(async ({ dojo, camera: testCamera }) =>
{
	window = dojo.window;
	camera = testCamera;
	await window.emulateMedia({ reducedMotion: "reduce" });
});

test("a concept quest: predict, the card with hover terms and the example, questions, results, loot", async () =>
{
	await setViewport(PROOF_SIZE.width, PROOF_SIZE.height);
	await openFake("#/quest?id=f1-uobject-and-actor");

	const concept = window.getByTestId("concept-quest");
	await expect(concept).toBeVisible();

	// Predict: a guess, locked in, then the answer and why.
	const predict = window.getByTestId("predict-step");
	await predict.getByTestId("choice").filter({ hasText: "constructors only run when an actor is spawned" }).click();
	await saveScreenshot("concept-predict");
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
	await saveScreenshot("concept-card-hover-term");
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
	await saveScreenshot("concept-results");

	// Loot.
	await window.getByRole("button", { name: "See your loot" }).click();
	await expect(window.getByTestId("screen-loot")).toHaveAttribute("data-passed", "true");
	await expect(window.getByTestId("loot-score")).toHaveAttribute("data-score", "100");
	await expect(window.getByTestId("xp-total")).toContainText("XP");
	await expect(window.getByTestId("loot-next")).toBeEnabled();
	await expect(window.getByTestId("progress-changes")).toBeVisible();
	await saveScreenshot("concept-loot");

	// Review dates come grouped with counts, never "tomorrow, tomorrow, tomorrow" (M2.2b).
	await expect(window.getByTestId("progress-changes")).toContainText(/\d+ reviews? /);

	// Next goes to the next quest in the world.
	await window.getByTestId("loot-next").click();
	await expect(window.getByTestId("screen-quest")).toHaveAttribute("data-quest", "f1-reflection-and-uclass");
});

test("a drill with every item type, Parsons distractors marked, and the finish card", async () =>
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
		else if (type === "which-pattern")
		{
			// Keyboard: focus a wrong pattern on purpose and pick it with Space, so the feedback shows why it does not fit.
			await item.locator(`[data-testid="choice"] input:not([value="${STATE_SCENARIO_ANSWER}"])`).first().focus();
			await window.keyboard.press("Space");
		}
		else if (type === "multiple-choice")
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
			await saveScreenshot("drill-parsons-marked");
		}

		if (type === "which-pattern")
		{
			await expect(item.getByTestId("question-feedback")).toHaveAttribute("data-correct", "false");
			await saveScreenshot("drill-pattern-discrimination");
		}
		if (type === "explain-in-one-sentence") await saveScreenshot("drill-explain-graded");
		if (type === "spot-the-bug") await saveScreenshot("drill-spot-the-bug");

		await window.getByRole("button", { name: index === 6 ? "Finish the drill" : "Next" }).click();
	}

	expect([...seen].sort()).toEqual(["explain-in-one-sentence", "fill-blank", "multiple-choice", "parsons", "spot-the-bug", "which-pattern"]);

	const summary = window.getByTestId("drill-summary");
	await expect(summary).toBeVisible();
	await expect(summary).toContainText("Next item due");
	await expect(summary).toContainText("streak kept");
	await saveScreenshot("drill-summary");
});

test("a breakdown: plan on the board, submit, compare with a reference, revise with a note, graded loot", async () =>
{
	await setViewport(PROOF_SIZE.width, PROOF_SIZE.height);
	await openFake("#/quest?id=f1-dash-with-cooldown");

	const workspace = window.getByTestId("breakdown-quest");
	await expect(workspace).toHaveAttribute("data-step", "plan");

	// No pattern names before the reference reveal (A64), and no hints while planning.
	await expect(window.getByTestId("pattern-chips")).toHaveCount(0);
	await expect(window.getByTestId("hint-spells")).toHaveCount(0);

	await addDashPieces();

	await expect(window.getByTestId("piece-node")).toHaveCount(5);

	// An arrow from the form: the dash component owns... the cooldown.
	const arrows = window.getByTestId("arrow-panel");
	await arrows.getByLabel("Arrow from").selectOption({ label: "DashComponent" });
	await arrows.getByLabel("Arrow meaning").selectOption("owns");
	await arrows.getByLabel("Arrow to").selectOption({ label: "CooldownComponent" });
	await arrows.getByRole("button", { name: "Add arrow" }).click();
	await expect(window.getByTestId("arrow-item")).toHaveCount(1);
	await saveScreenshot("breakdown-plan");

	await window.getByTestId("submit-plan").click();
	await expect(workspace).toHaveAttribute("data-step", "compare");
	await expect(window.getByTestId("reference-heading")).toBeInViewport();
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
	await saveScreenshot("breakdown-compare");

	await window.getByTestId("grade-revision").click();
	await expect(window.getByTestId("screen-loot")).toBeVisible();
	await expect(window.getByTestId("breakdown-grade")).toBeVisible();
	await expect(window.locator('[data-testid="required-pieces"] li[data-covered="true"]')).not.toHaveCount(0);
	await saveScreenshot("breakdown-loot");
	await window.getByTestId("breakdown-grade").scrollIntoViewIfNeeded();
	await saveScreenshot("breakdown-loot-grade");

	// The next quest by order is the boss, still locked: Next goes back to the map instead (M2.2b).
	await expect(window.getByTestId("loot-next")).toHaveText(/Back to the map/);
});

test("the breakdown compare step stays readable at 1100x700: boards at a usable zoom and the reference as text", async () =>
{
	await setViewport(1100, 700);
	await openFake("#/quest?id=f1-dash-with-cooldown");
	await addDashPieces();
	await window.getByTestId("submit-plan").click();
	await expect(window.getByTestId("breakdown-quest")).toHaveAttribute("data-step", "compare");

	// The compare step opens at its top: nothing focused far down pulls the page away from the reference.
	await expect(window.getByTestId("reference-heading")).toBeInViewport();

	// Both boards are drawn at about 0.6 zoom or more, so a card's text can be read without zooming.
	for (const board of ["learner-board", "reference-board"])
	{
		await expect(window.getByTestId(board).getByTestId("piece-node").first()).toBeVisible();
		await expect.poll(() => boardZoom(board), { message: `${board} zoom` }).toBeGreaterThanOrEqual(0.6);
	}

	// The reference plan is also there as text: every piece and every arrow in words.
	await expect(window.getByTestId("reference-piece")).toHaveCount(8);
	await expect(window.getByTestId("reference-edge")).toHaveCount(8);
	await expectNoSidewaysScroll("breakdown compare at 1100x700");
	await saveScreenshot("breakdown-compare-1100x700");
	await window.getByTestId("reference-text").scrollIntoViewIfNeeded();
	await saveScreenshot("breakdown-compare-text-1100x700");
});

test("at 1440x900 the breakdown compare step opens with the reference and the revision note in view", async () =>
{
	await setViewport(1440, 900);
	await openFake("#/quest?id=f1-dash-with-cooldown");
	await addDashPieces();
	await window.getByTestId("submit-plan").click();
	await expect(window.getByTestId("breakdown-quest")).toHaveAttribute("data-step", "compare");

	// Side by side here: the revise column starts at its top, so the reference heading and the note box are on screen without scrolling.
	await expect(window.getByTestId("reference-heading")).toBeInViewport();
	await expect(window.getByTestId("revision-note")).toBeInViewport();
	await expect(window.getByTestId("revision-note")).not.toBeFocused();
	await expect.poll(() => boardZoom("reference-board"), { message: "reference-board zoom" }).toBeGreaterThanOrEqual(0.6);
});

test("a build: explain the marked lines, Run fails, a hint, fix, Run passes, Submit with a review retry, loot, see it run", async () =>
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

	// Below 1600 wide the brief starts folded so the editor has room; the toggle opens it. Opening the gaps folds it again.
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

	await saveScreenshot("build-gate");
	await window.getByTestId("open-gaps").click();
	await expect(window.getByTestId("self-explanation-gate")).toHaveAttribute("data-open", "true");
	await saveScreenshot("build-gate-open");
	await window.getByTestId("toggle-reasons").click();

	await expect(window.getByTestId("brief-column")).toHaveCount(0);

	// Run the starter with the keyboard from outside the editor: it builds, and the reflection test fails.
	await window.getByRole("heading", { level: 1 }).click();
	await window.keyboard.press(`${SHORTCUT_MODIFIER}+Enter`);
	await expect(window.getByTestId("run-result")).toHaveAttribute("data-ok", "false", { timeout: 20_000 });
	await expect(window.locator('[data-testid="test-row"][data-passed="false"]').first()).toBeVisible();
	await saveScreenshot("build-run-fails");

	// A hint spell.
	await window.getByTestId("reveal-hint").click();
	await expect(window.getByTestId("hint-text")).toHaveCount(1);
	await saveScreenshot("build-hint");

	// Leave the quest and come back: the paid hint returns with the quest (A502), and the button offers hint 2, not hint 1 again.
	await window.evaluate(`location.hash = "#/world-map"`);
	await expect(window.getByTestId("screen-worldMap")).toBeVisible();
	await window.evaluate(`location.hash = "#/quest?id=f1-training-dummy"`);
	await waitForEditor(window.getByTestId("build-quest"));
	await expect(window.getByTestId("hint-text")).toHaveCount(1);
	await expect(window.getByTestId("reveal-hint")).toContainText("Reveal hint 2");
	await expect(window.getByTestId("self-explanation-gate")).toHaveAttribute("data-open", "true");

	// Fill both gaps by typing in Monaco.
	const editor = build.getByTestId("code-editor");
	await window.getByTestId("file-tab").filter({ hasText: "DojoF1TrainingDummy.h" }).click();
	await expect(editor.locator(".view-lines")).toContainText("GENERATED_BODY");
	await selectInEditor(editor, "void Strike();");
	await typeInEditor('UFUNCTION(BlueprintCallable, Category = "Dummy")\nvoid Strike();');
	await expect.poll(() => visibleEditorText()).toMatch(/\n\s*UFUNCTION\(BlueprintCallable, Category = "Dummy"\)\n\s*void Strike\(\);\n/);
	await saveScreenshot("build-editing-header");

	await window.getByTestId("file-tab").filter({ hasText: "DojoF1TrainingDummy.cpp" }).click();
	await expect(editor.locator(".view-lines")).toContainText("CreateDefaultSubobject");
	await selectInEditor(editor, "// Your code: do nothing if the dummy is already down; otherwise count the strike and refresh the label.");
	await typeInEditor("if (IsKnockedDown()) return;\nHitsTaken++;\nRefreshLabel();");
	await expect.poll(() => visibleEditorText()).toMatch(/\{\n\s*if \(IsKnockedDown\(\)\) return;\n\s*HitsTaken\+\+;\n\s*RefreshLabel\(\);\n\}/);
	await saveScreenshot("build-editing-source");

	// Run again from inside the editor: every test passes.
	await window.keyboard.press(`${SHORTCUT_MODIFIER}+Enter`);
	await expect(window.getByTestId("run-result")).toHaveAttribute("data-ok", "true", { timeout: 20_000 });
	await expect(window.locator('[data-testid="test-row"][data-passed="false"]')).toHaveCount(0);
	await saveScreenshot("build-run-passes");

	// Submit: the review times out into tests-only with Retry review; the retry gets the mentor's review.
	await window.getByTestId("submit-button").click();
	await expect(window.getByTestId("screen-loot")).toBeVisible({ timeout: 20_000 });
	await expect(window.getByTestId("review-fallback")).toBeVisible();
	await window.getByTestId("retry-review").click();
	await expect(window.getByTestId("code-review")).toHaveAttribute("data-provider", "claude-code", { timeout: 20_000 });
	await expect(window.getByTestId("screen-loot")).toHaveAttribute("data-passed", "true");
	await expect(window.getByTestId("xp-total")).not.toHaveText("0 XP");
	await expect(window.getByTestId("review-score")).toContainText("review score");

	// Findings explain themselves for free; the reflection takes one sentence.
	await window.getByTestId("finding-why").first().click();
	await expect(window.getByTestId("finding-explanation")).toBeVisible();
	await window.getByTestId("reflection").getByRole("textbox").fill("Designers tune the strikes in the Details panel because the function and property are reflected.");
	await window.getByTestId("reflection").getByRole("button", { name: "Send my answer" }).click();
	await expect(window.getByTestId("reflection-grade")).toBeVisible();
	await expect(window.getByTestId("loot-alternative")).toBeVisible();
	await window.evaluate("document.querySelector('main').scrollTo({ top: 0 })");
	await saveScreenshot("build-loot");
	await window.getByTestId("code-review").scrollIntoViewIfNeeded();
	await saveScreenshot("build-loot-review");

	await window.getByTestId("see-it-run").click();
	await expect(window.getByTestId("see-it-run")).toBeEnabled();

	// Improve returns to the quest with the last submit kept.
	await window.getByTestId("loot-improve").click();
	await expect(window.getByTestId("last-submit")).toHaveAttribute("data-passed", "true");
});

test("two failed submits offer the Parsons fallback, which opens a one-item drill", async () =>
{
	await setViewport(PROOF_SIZE.width, PROOF_SIZE.height);
	await openFake("#/quest?id=f1-score-keeper");

	const build = window.getByTestId("build-quest");
	await waitForEditor(build);

	// First submit: the starter builds and its test fails. Improve shows that Submit's tests in the run column (M2.2b).
	await window.getByTestId("submit-button").click();
	await expect(window.getByTestId("screen-loot")).toHaveAttribute("data-passed", "false", { timeout: 20_000 });
	await window.getByTestId("loot-improve").click();
	await waitForEditor(window.getByTestId("build-quest"));
	await expect(window.getByTestId("run-result")).toHaveAttribute("data-source", "submit");
	await expect(window.locator('[data-testid="test-row"][data-passed="false"]').first()).toBeVisible();

	// Second submit does not compile: the loot says so, and Improve shows the compiler output beside the code.
	await selectInEditor(window.getByTestId("build-quest").getByTestId("code-editor"), "#pragma once");
	await typeInEditor("#pragma once\n{");
	await window.getByTestId("submit-button").click();
	await expect(window.getByTestId("screen-loot")).toHaveAttribute("data-passed", "false", { timeout: 20_000 });
	await expect(window.getByTestId("loot-review")).toContainText("did not compile");
	await window.getByTestId("loot-improve").click();
	await waitForEditor(window.getByTestId("build-quest"));
	await expect(window.getByTestId("run-result")).toContainText("Last submit: did not compile");
	await expect(window.getByTestId("build-log")).toContainText("error");
	await saveScreenshot("build-last-submit-did-not-compile");

	await expect(window.getByTestId("failed-submit-offers")).toBeVisible();
	await setViewport(1100, 700);
	await expectNoSidewaysScroll("build with the failed-submit offers at 1100x700");
	await setViewport(PROOF_SIZE.width, PROOF_SIZE.height);
	await expect(async () =>
	{
		await window.mouse.move(5, 5);
		await window.getByTestId("seer-stone-offer").hover();
		await expect(window.getByRole("tooltip")).toContainText("Seer Stone", { timeout: 1_500 });
	}).toPass({ timeout: 10_000 });
	await saveScreenshot("build-failed-submit-offers");

	await window.getByTestId("parsons-fallback").click();
	await expect(window.getByTestId("screen-drill")).toHaveAttribute("data-kind", "parsons-fallback");
	await expect(window.getByTestId("drill-position")).toContainText("1 / 1");
	await expect(window.getByTestId("parsons")).toBeVisible();
});

test("every quest screen fits at 1100x700 and 1440x900 without sideways scroll", async () =>
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

			// The board keeps room to plan in, even at the smallest window (the spec folds below 1300 wide).
			if (route.file === "breakdown") expect((await window.getByTestId("learner-board").boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(450);

			await expectNoSidewaysScroll(`${route.file} at ${size.width}x${size.height}`);
			await saveScreenshot(`${route.file}-${size.width}x${size.height}`);
		}
	}
});
