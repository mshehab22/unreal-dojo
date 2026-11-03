// M2.4b: records the learner flow against the typed fake (no engine) as one captioned GIF, docs/iterations/m2-4-learner-flow.gif. Each step of
// e2e/learner-flow.spec.ts (the real-engine flow) and e2e/ui-quests-flow.spec.ts is driven the same way here: set up the sandbox, hover a term,
// predict and pass a concept quest, a drill, a breakdown submitted and revised, a build that fails, takes a hint, and passes, the loot screen with the next quest
// named on its button. Two steps are not here (A1851): the restart that keeps progress, because the fake keeps its state in memory, and the next quest unlocking,
// because the fake opens every World 1 stage but the boss from the start. Only the engine-gated learner flow proves those.
// Opt-in: it only runs with DOJO_RECORD_FLOW=1, so `npm run test:e2e` never runs it. Run it after `npm run build`:
//     DOJO_RECORD_FLOW=1 npx playwright test e2e/learner-flow-recording.spec.ts
// The GIF is assembled by e2e/support/framesToGif.py, which needs Python 3 with Pillow; the repo adds no dependency for it (A1850).
// Page scripts are strings: e2e is typechecked without the DOM library.
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { answerParsons, answerQuestion, readAnswerKey, type AnswerKey } from "./support/answerKey";
import { expect, test } from "./support/dojoTest";
import { hoverAtCentre } from "./support/hoverAtCentre";

const ENABLED = process.env["DOJO_RECORD_FLOW"] === "1";

/** Where the finished recording goes. */
const OUTPUT_GIF = resolve("docs/iterations/m2-4-learner-flow.gif");

/** The page size every frame is taken at. */
const FRAME_SIZE = { width: 1280, height: 800 } as const;

/** How long a frame stays on screen, in milliseconds: a normal step, and a step the viewer should have time to read. */
const HOLD = 1_400;
const LONG_HOLD = 2_600;

/** The quest the loot screen's Next button offers after the training dummy (World 1's next stage). */
const NEXT_QUEST_TITLE = "UENUM and USTRUCT bring your own types into reflection";

const SHORTCUT_MODIFIER = process.platform === "darwin" ? "Meta" : "Control";

/** The breakdown's first plan (content/.../11-breakdown-dash-cooldown.md), the same one learner-flow.spec.ts submits. */
const DASH_PLAN = [
	{ kind: "step", label: "Bind a dash input action to the dash", purpose: "Pressing the dash button becomes a request to dash" },
	{ kind: "class", label: "Something on the character that performs the dash", purpose: "Turns a request into a launch along the flattened camera direction" },
	{ kind: "component", label: "A cooldown that can start and answer whether it is ready", purpose: "The refusal rule lives somewhere reusable" },
	{ kind: "step", label: "Ignore movement input for the lock window", purpose: "The player cannot steer mid-dash" },
	{ kind: "event", label: "Dash started and cooldown ready events", purpose: "The HUD and effects listen instead of checking every frame" },
	{ kind: "data", label: "Distance, lock time, and cooldown as editable values", purpose: "Designers tune the feel without a rebuild" },
] as const;

/** One captured frame, as the GIF helper reads it. */
interface RecordedFrame
{
	file: string;
	caption: string;
	holdMilliseconds: number;
}

let window: Page;
let answers: AnswerKey;
let frames: RecordedFrame[];
let framesFolder: string;

/** Takes a frame: a screenshot of the window with the caption the GIF shows under it. */
async function frame(caption: string, holdMilliseconds = HOLD): Promise<void>
{
	const file = `${framesFolder}/frame-${String(frames.length).padStart(2, "0")}.png`;

	await window.evaluate("document.fonts.ready.then(() => true)");
	await window.screenshot({ path: file });
	frames.push({ file, caption, holdMilliseconds });
}

/** Scrolls the stage back to its top, so a loot screen is photographed from its heading, not from wherever the last step left it. */
async function scrollStageToTop(): Promise<void>
{
	await window.evaluate("document.querySelector('main').scrollTo({ top: 0 })");
}

/** Forces the page to render at an exact size, independent of how large the OS lets the window be (A90). */
async function setViewport(width: number, height: number): Promise<void>
{
	const session = await window.context().newCDPSession(window);

	await session.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
}

/** Switches to a fresh fake in the given scenario and opens a route hash; reloading also resets the fake's state. */
async function openFake(hash: string, scenario: string): Promise<void>
{
	await window.evaluate(`localStorage.setItem("dojo.dataSource", "fake:${scenario}"); location.hash = ${JSON.stringify(hash)}`);
	await window.reload();
	await window.waitForLoadState("domcontentloaded");
	await window.evaluate("document.fonts.ready.then(() => true)");
}

/** Moves to a route hash inside the running fake (no reload, so the fake keeps its state) and waits for its screen. */
async function goTo(hash: string, testId: string): Promise<void>
{
	await window.evaluate(`location.hash = ${JSON.stringify(hash)}`);
	await expect(window.getByTestId(testId)).toBeVisible();
	await expect(window.getByTestId(testId).getByTestId("loading")).toHaveCount(0);
}

/** Waits until Monaco has drawn its lines inside a locator. */
async function waitForEditor(scope: Locator): Promise<void>
{
	await expect(scope.locator(".monaco-editor .view-lines")).toBeVisible({ timeout: 15_000 });
}

/** Finds `text` in the focused Monaco editor with its find widget, then leaves the match selected (the keyboard path of the M2.2 spec). */
async function selectInEditor(editor: Locator, text: string): Promise<void>
{
	await editor.locator(".view-lines").click();
	await window.keyboard.press(`${SHORTCUT_MODIFIER}+f`);
	await expect(editor.locator(".find-widget.visible textarea, .find-widget.visible input").first()).toBeFocused();
	await window.keyboard.press(`${SHORTCUT_MODIFIER}+a`);
	await window.keyboard.insertText(text);
	await expect(editor.locator(".find-widget .matchesCount")).toHaveText(/^1 of 1$/);
	await window.keyboard.press("Enter");
	await window.keyboard.press("Escape");
	await expect(editor.locator(".find-widget.visible")).toHaveCount(0);
}

/** Inserts text into the focused editor as one input; two frames later the caret scroll has settled (see the M2.2 spec). */
async function typeInEditor(text: string): Promise<void>
{
	await window.keyboard.insertText(text);
	await window.evaluate("new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
	await window.keyboard.press("End");
}

/** Chapter 1: a fresh learner names the studio, picks an engine and a folder, and the sandbox builds (the fake's first run). */
async function setUpTheSandbox(): Promise<void>
{
	await openFake("#/", "fresh");
	await expect(window.getByTestId("screen-title")).toBeVisible();
	await window.getByRole("textbox", { name: "What should your studio call you?" }).fill("Playtester");
	await frame("1. Fake data, no engine: a new learner names their studio");
	await window.getByRole("button", { name: "Set up your studio" }).click();

	await expect(window.getByTestId("first-run-engine")).toBeVisible();
	await expect(window.getByTestId("toolchain-ok")).toBeVisible();
	await frame("2. Set up the sandbox: choose an Unreal Engine");
	await window.getByRole("button", { name: "Use this engine" }).click();

	await window.getByRole("button", { name: "Choose a folder" }).click();
	await expect(window.getByTestId("sandbox-folder")).toBeVisible();
	await frame("3. Choose where the sandbox project lives");
	await window.getByRole("button", { name: "Use this folder" }).click();

	await window.getByRole("button", { name: "Start the build" }).click();
	await expect(window.getByTestId("build-progress")).toHaveAttribute("data-phase", "building");
	await frame("4. The sandbox builds, with progress");
	await expect(window.getByTestId("build-succeeded")).toBeVisible({ timeout: 15_000 });
	await window.getByRole("button", { name: "Continue" }).click();

	await window.getByRole("button", { name: "Open the editor" }).click();
	await expect(window.getByTestId("editor-connected")).toBeVisible();
	await window.getByRole("button", { name: "Continue" }).click();
	await expect(window.getByTestId("first-run-done")).toBeVisible();
	await window.getByRole("button", { name: "Enter your studio" }).click();
	await expect(window.getByTestId("screen-studio")).toBeVisible();
	await frame("5. Into the studio", LONG_HOLD);
}

/** Chapter 2: the first concept quest: predict, hover a term on the card, answer, results, loot. */
async function passTheConceptQuest(): Promise<void>
{
	await openFake("#/quest?id=f1-uobject-and-actor", "quests");

	const predict = window.getByTestId("predict-step");
	await expect(predict).toBeVisible();
	await answerQuestion(answers, predict.getByTestId("question"));
	await frame("6. A concept quest starts with a prediction");
	await predict.getByRole("button", { name: "Lock in my guess" }).click();
	await expect(window.getByTestId("predict-reveal")).toBeVisible();
	await frame("7. The guess is locked in, then the answer and why");
	await predict.getByRole("button", { name: "Read the card" }).click();

	const card = window.getByTestId("card-step");
	await expect(card).toBeVisible();
	await expect(card.locator(".monaco-editor .view-lines")).toBeVisible({ timeout: 15_000 });

	const term = card.getByTestId("glossary-term").first();

	await expect(async () =>
	{
		await hoverAtCentre(window, term);
		await expect(window.getByTestId("term-card")).toBeVisible({ timeout: 3_000 });
	}).toPass({ timeout: 15_000 });
	await frame("8. Hover a term on the card for its definition", LONG_HOLD);
	await window.mouse.move(5, 5);

	await card.getByRole("button", { name: "Answer the questions" }).click();

	const questions = window.getByTestId("concept-question");
	await expect(questions.first()).toBeVisible();

	for (let index = 0; index < (await questions.count()); index++) await answerQuestion(answers, questions.nth(index).getByTestId("question"));

	await window.getByRole("button", { name: "Submit answers" }).click();
	await expect(window.getByTestId("concept-result")).toBeVisible({ timeout: 30_000 });
	await frame("9. Every answer graded, with the model answer");
	await window.getByRole("button", { name: "See your loot" }).click();
	await expect(window.getByTestId("screen-loot")).toHaveAttribute("data-passed", "true");
	await scrollStageToTop();
	await frame("10. The loot screen: XP, score, and what comes next", LONG_HOLD);
}

/** Chapter 3: one due drill from the Studio, every item answered right from the content. */
async function runTheDrill(): Promise<void>
{
	await goTo("#/studio", "screen-studio");
	await window.getByTestId("start-drill").click();
	await expect(window.getByTestId("screen-drill")).toBeVisible();

	const total = Number(/\/\s*(\d+)/.exec(await window.getByTestId("drill-position").innerText())?.[1] ?? "0");

	for (let index = 0; index < total; index++)
	{
		const item = window.getByTestId("drill-item");

		if ((await item.getAttribute("data-source")) === "parsons") await answerParsons(answers, item);
		else await answerQuestion(answers, item.getByTestId("question"));

		await window.getByRole("button", { name: "Check" }).click();
		await expect(item.getByTestId("question-feedback")).toBeVisible({ timeout: 30_000 });
		if (index === 0) await frame("11. A drill brings the old ideas back as practice");
		await window.getByRole("button", { name: index === total - 1 ? "Finish the drill" : "Next" }).click();
	}

	await expect(window.getByTestId("drill-summary")).toBeVisible();
	await frame("12. The drill summary: score and when the next item is due", LONG_HOLD);
}

/** Chapter 4: the breakdown: a first plan, the reference, two missing pieces and a note, graded. */
async function submitAndReviseTheBreakdown(): Promise<void>
{
	await goTo("#/quest?id=f1-dash-with-cooldown", "screen-quest");

	const workspace = window.getByTestId("breakdown-quest");
	await expect(workspace).toHaveAttribute("data-step", "plan");

	for (const piece of DASH_PLAN)
	{
		await window.getByTestId(`add-piece-${piece.kind}`).click();
		await window.getByTestId("piece-label").fill(piece.label);
		await window.getByTestId("piece-purpose").fill(piece.purpose);
	}

	await frame("13. A breakdown: plan the mechanic on the board before any code");
	await window.getByTestId("submit-plan").click();
	await expect(workspace).toHaveAttribute("data-step", "compare", { timeout: 30_000 });
	await expect(window.getByTestId("reference-heading")).toBeInViewport();
	await frame("14. Compare with a reference plan", LONG_HOLD);

	await window.getByTestId("add-piece-step").click();
	await window.getByTestId("piece-label").fill("Stop the dash on a blocking hit");
	await window.getByTestId("piece-purpose").fill("A launched character must not slide along a wall at dash speed");
	await window.getByTestId("add-piece-class").click();
	await window.getByTestId("piece-label").fill("HUD cooldown wedge that listens to the events");
	await window.getByTestId("piece-purpose").fill("Shows when the next dash is ready and proves the events work");
	await window.getByTestId("revision-note").fill("The reference showed the wall stop and the HUD wedge, so I added both as their own pieces.");
	await frame("15. Revise the plan and say why");
	await window.getByTestId("grade-revision").click();

	await expect(window.getByTestId("screen-loot")).toHaveAttribute("data-passed", "true", { timeout: 30_000 });
	await expect(window.getByTestId("breakdown-grade")).toBeVisible();
	await scrollStageToTop();
	await frame("16. The revised plan is graded", LONG_HOLD);
}

/** Chapter 5: the training dummy build: explain the marked lines, Run fails, a hint, fix in the editor, Run passes, Submit, loot. */
async function buildFailHintPass(): Promise<void>
{
	await goTo("#/quest?id=f1-training-dummy", "screen-quest");

	const build = window.getByTestId("build-quest");
	await waitForEditor(build);

	const explanations = window.getByTestId("self-explanation");

	if ((await window.getByTestId("self-explanation-gate").getAttribute("data-open")) !== "true")
	{
		await window.getByTestId("toggle-brief").click();
		for (let index = 0; index < (await explanations.count()); index++) await explanations.nth(index).fill("This line lets the engine see and use the class safely");
		await frame("17. A build quest: explain the marked lines first");
		await window.getByTestId("open-gaps").click();
		await expect(window.getByTestId("self-explanation-gate")).toHaveAttribute("data-open", "true");
		await window.getByTestId("toggle-reasons").click();
	}

	await window.getByRole("heading", { level: 1 }).click();
	await window.keyboard.press(`${SHORTCUT_MODIFIER}+Enter`);
	await expect(window.getByTestId("run-result")).toHaveAttribute("data-ok", "false", { timeout: 20_000 });
	await expect(window.locator('[data-testid="test-row"][data-passed="false"]').first()).toBeVisible();
	await frame("18. Run: the starter builds and its test fails", LONG_HOLD);

	await window.getByTestId("reveal-hint").click();
	await expect(window.getByTestId("hint-text")).toHaveCount(1);
	await frame("19. A hint nudges without giving the answer", LONG_HOLD);

	const editor = build.getByTestId("code-editor");

	await window.getByTestId("file-tab").filter({ hasText: "DojoF1TrainingDummy.h" }).click();
	await expect(editor.locator(".view-lines")).toContainText("GENERATED_BODY");
	await selectInEditor(editor, "void Strike();");
	await typeInEditor('UFUNCTION(BlueprintCallable, Category = "Dummy")\nvoid Strike();');
	await window.getByTestId("file-tab").filter({ hasText: "DojoF1TrainingDummy.cpp" }).click();
	await expect(editor.locator(".view-lines")).toContainText("CreateDefaultSubobject");
	await selectInEditor(editor, "// Your code: do nothing if the dummy is already down; otherwise count the strike and refresh the label.");
	await typeInEditor("if (IsKnockedDown()) return;\nHitsTaken++;\nRefreshLabel();");
	await frame("20. Fix both gaps in the editor");

	await window.keyboard.press(`${SHORTCUT_MODIFIER}+Enter`);
	await expect(window.getByTestId("run-result")).toHaveAttribute("data-ok", "true", { timeout: 20_000 });
	await expect(window.locator('[data-testid="test-row"][data-passed="false"]')).toHaveCount(0);
	await frame("21. Run again: every test passes", LONG_HOLD);

	await window.getByTestId("submit-button").click();
	await expect(window.getByTestId("screen-loot")).toBeVisible({ timeout: 20_000 });
	await expect(window.getByTestId("screen-loot")).toHaveAttribute("data-passed", "true");
	await scrollStageToTop();
	await frame("22. Submit: the loot screen with the review and XP", LONG_HOLD);

	// The Next button names the next quest. This does not show an unlock: the fake opens most World 1 stages from the start (questFlowFixture), so the real flow proves that.
	await expect(window.getByTestId("loot-next")).toContainText(NEXT_QUEST_TITLE);
	await window.getByTestId("loot-next").scrollIntoViewIfNeeded();
	await frame("23. The Next button names the next quest", LONG_HOLD);
	await goTo("#/world-map", "screen-worldMap");
	await frame("24. The World Map after the pass (the fake starts most stages open)", LONG_HOLD);
}

test.describe("the learner flow recorded against the fake", () =>
{
	test.skip(!ENABLED, "Opt-in: set DOJO_RECORD_FLOW=1 (writes docs/iterations/m2-4-learner-flow.gif; needs Python 3 with Pillow).");

	test("first run to a passed build, recorded as a GIF", async ({ dojo }, testInfo) =>
	{
		test.setTimeout(5 * 60_000);
		window = dojo.window;
		answers = readAnswerKey();
		frames = [];
		framesFolder = testInfo.outputPath("frames");
		mkdirSync(framesFolder, { recursive: true });

		await window.emulateMedia({ reducedMotion: "reduce" });
		await setViewport(FRAME_SIZE.width, FRAME_SIZE.height);

		await setUpTheSandbox();
		await passTheConceptQuest();
		await runTheDrill();
		await submitAndReviseTheBreakdown();
		await buildFailHintPass();

		const manifestPath = `${framesFolder}/manifest.json`;

		writeFileSync(manifestPath, JSON.stringify(frames, null, 2));
		// `python` on Windows, `python3` elsewhere; the first that runs wins, and the second is only tried when the first fails.
		const helper = resolve("e2e/support/framesToGif.py");
		const attempts: SpawnSyncReturns<string>[] = [];

		for (const command of ["python", "python3"])
		{
			attempts.push(spawnSync(command, [helper, manifestPath, OUTPUT_GIF], { encoding: "utf8" }));
			if (attempts[attempts.length - 1]?.status === 0) break;
		}

		const finished = attempts.find((attempt) => attempt.status === 0);

		expect(finished, `framesToGif.py needs Python 3 with Pillow: ${attempts.map((attempt) => attempt.stderr || String(attempt.error)).join(" | ")}`).toBeTruthy();
	});
});
