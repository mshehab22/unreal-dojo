// M2.4: a fresh learner's whole first world against the REAL bridge and a real Unreal Engine: first-run setup, a hover term, concept quests with
// a prediction, drills, a build that fails, takes a hint, and passes, a breakdown submitted and revised, loot, the next quest unlocking, and a restart
// that keeps everything. Opt-in: it needs an engine and takes many minutes, so it only runs with DOJO_E2E_ENGINE=1 (docs/systems/qa-and-ci.md).
// Optional: DOJO_E2E_ENGINE_PATH (default ~/Applications/UE_5.8), DOJO_E2E_ENGINE_LOCK (a folder made with mkdir as a machine-wide engine lock, held only
// around the steps that run Unreal: the sandbox build, each Run, each Submit).
// With SAVE_PROOF=1 a passing run writes its pictures to docs/iterations/m2-4-*.jpg. Page scripts are strings: e2e is typechecked without the DOM library.
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmdirSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";

import type { ElectronApplication, Locator, Page, TestInfo } from "@playwright/test";

import { answerParsons, answerQuestion, readAnswerKey, type AnswerKey } from "./support/answerKey";
import { stubOpenDialog } from "./support/dialogStubs";
import { expect, test } from "./support/dojoTest";
import { closeDojoKeepingData, launchDojo } from "./support/launchDojo";
import type { ProofCamera } from "./support/ProofCamera";

const ENABLED = process.env["DOJO_E2E_ENGINE"] === "1";
const ENGINE_PATH = process.env["DOJO_E2E_ENGINE_PATH"] ?? join(homedir(), "Applications", "UE_5.8");
const ENGINE_LOCK = process.env["DOJO_E2E_ENGINE_LOCK"];

/** The proof picture size. */
const PROOF_SIZE = { width: 1280, height: 800 } as const;

/** The first full sandbox build; UBT itself gives up after 15 minutes. */
const SANDBOX_BUILD_TIMEOUT_MS = 20 * 60_000;

/** One Run or Submit of a build quest: an incremental build plus a headless test run. */
const ENGINE_RUN_TIMEOUT_MS = 10 * 60_000;

/** World 1's quests by id, with the titles the stage nodes use as their labels. */
const QUESTS = {
	uobject: { id: "f1-uobject-and-actor", title: "UObjects, actors, and the class default object" },
	reflection: { id: "f1-reflection-and-uclass", title: "Reflection, UCLASS, and the generated header" },
	uproperty: { id: "f1-uproperty-specifiers", title: "UPROPERTY specifiers decide who can see and change a field" },
	ufunction: { id: "f1-ufunction-specifiers", title: "UFUNCTION opens a function to Blueprint and the console" },
	trainingDummy: { id: "f1-training-dummy", title: "A training dummy the console can strike" },
	enums: { id: "f1-uenum-and-ustruct", title: "UENUM and USTRUCT bring your own types into reflection" },
	popupTarget: { id: "f1-popup-target", title: "A pop-up target that shows its state by name" },
	cast: { id: "f1-cast-and-isa", title: "Cast and IsA ask an object what it really is" },
	scoreKeeper: { id: "f1-score-keeper", title: "A score keeper that tells dummies from targets" },
	practiceBell: { id: "f1-practice-bell", title: "A bell whose ring Blueprint can restyle" },
	dash: { id: "f1-dash-with-cooldown", title: "Plan a dash with a cooldown" },
	boss: { id: "f1-boss-training-yard", title: "Boss: the training yard" },
} as const;

/** One World 1 quest. */
type WorldQuest = (typeof QUESTS)[keyof typeof QUESTS];

/** The breakdown's required pieces (content/.../11-breakdown-dash-cooldown.md), the plan the learner first submits. */
const DASH_PLAN = [
	{ kind: "step", label: "Bind a dash input action to the dash", purpose: "Pressing the dash button becomes a request to dash" },
	{ kind: "class", label: "Something on the character that performs the dash", purpose: "Turns a request into a launch along the flattened camera direction" },
	{ kind: "component", label: "A cooldown that can start and answer whether it is ready", purpose: "The refusal rule lives somewhere reusable" },
	{ kind: "step", label: "Ignore movement input for the lock window", purpose: "The player cannot steer mid-dash" },
	{ kind: "event", label: "Dash started and cooldown ready events", purpose: "The HUD and effects listen instead of checking every frame" },
	{ kind: "data", label: "Distance, lock time, and cooldown as editable values", purpose: "Designers tune the feel without a rebuild" },
] as const;

const SHORTCUT_MODIFIER = process.platform === "darwin" ? "Meta" : "Control";

let window: Page;
let electronApp: ElectronApplication;
let camera: ProofCamera;
let answers: AnswerKey;
let testInfo: TestInfo;

/** Screenshots the page into test-results/; a passing run with SAVE_PROOF=1 also writes it to docs/iterations/m2-4-<name>.jpg. */
async function saveScreenshot(name: string): Promise<void>
{
	await camera.capture(window, `m2-4-${name}.png`, { proofFileName: `m2-4-${name}.jpg`, proofFormat: "jpeg" });
}

/**
 * An expectation a reported bug still breaks. While the bug stands, the check fails quietly and the run records a "known failure" annotation
 * naming the fix task; once the fix lands and the check passes, the test fails so the mark is dropped and the check becomes a plain expectation.
 */
async function expectKnownFailure(task: string, description: string, check: () => Promise<void>): Promise<void>
{
	try
	{
		await check();
	}
	catch (error)
	{
		testInfo.annotations.push({ type: "known failure", description: `${task}: ${description} (${String(error).split("\n")[0]})` });
		return;
	}

	throw new Error(`Known failure fixed: ${task}: ${description}. Remove the expectKnownFailure wrapper so this is a normal expectation.`);
}

/** Forces the page to render at an exact size, independent of how large the OS lets the window be (A90). */
async function setViewport(width: number, height: number): Promise<void>
{
	const session = await window.context().newCDPSession(window);

	await session.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
}

/** Moves to a route hash and waits for its screen. */
async function goTo(hash: string, testId: string): Promise<void>
{
	await window.evaluate(`location.hash = ${JSON.stringify(hash)}`);
	await expect(window.getByTestId(testId)).toBeVisible();
	await expect(window.getByTestId(testId).getByTestId("loading")).toHaveCount(0);
}

/** The World Map stage node of a quest; its aria-label starts with the quest's title. */
async function stageNode(quest: WorldQuest): Promise<Locator>
{
	await goTo("#/world-map", "screen-worldMap");

	return window.locator(`[data-testid="stage-node"][aria-label^=${JSON.stringify(`${quest.title}:`)}]`);
}

/** Fails unless the quest's stage node is open on the World Map. */
async function expectUnlocked(quest: WorldQuest): Promise<void>
{
	await expect(await stageNode(quest)).not.toHaveAttribute("data-status", "locked");
}

/** Opens a quest from its World Map stage node, the way a learner does. */
async function openQuest(quest: WorldQuest): Promise<void>
{
	const node = await stageNode(quest);

	await expect(node).not.toHaveAttribute("data-status", "locked");
	await node.click();
	await expect(window.getByTestId("screen-quest")).toHaveAttribute("data-quest", quest.id);
}

/** Takes the machine-wide engine lock (a folder made with mkdir), waiting while another run holds it. */
async function takeEngineLock(): Promise<void>
{
	if (!ENGINE_LOCK) return;

	for (;;)
	{
		try
		{
			mkdirSync(ENGINE_LOCK);
			return;
		}
		catch
		{
			await new Promise((resolvePromise) => setTimeout(resolvePromise, 20_000));
		}
	}
}

/** Gives the engine lock back. */
function releaseEngineLock(): void
{
	if (ENGINE_LOCK) rmdirSync(ENGINE_LOCK);
}

/** Holds the engine lock only while `step` runs Unreal (a sandbox build, a Run, a Submit), so other sessions can use the engine in between. */
async function withEngineLock<Value>(step: () => Promise<Value>): Promise<Value>
{
	await takeEngineLock();

	try
	{
		return await step();
	}
	finally
	{
		releaseEngineLock();
	}
}

/** Title, the first-run steps with the real engine and a stubbed folder picker, the first full sandbox build, into the Studio. */
async function firstRunSetup(pickedFolder: string): Promise<void>
{
	await goTo("#/", "screen-title");
	await expect(window.getByTestId("fake-data-badge")).toHaveCount(0);
	await window.getByLabel("What should your studio call you?").fill("Playtester");
	await saveScreenshot("01-title-fresh");
	await window.getByRole("button", { name: "Set up your studio" }).click();

	await expect(window.getByTestId("first-run-engine")).toBeVisible();
	const engine = window.getByTestId("engine-option").filter({ hasText: ENGINE_PATH });
	await engine.click();
	await expect(engine).toHaveAttribute("aria-checked", "true");
	await expect(window.getByRole("button", { name: "Use this engine" })).toBeEnabled({ timeout: 60_000 });
	await saveScreenshot("02-first-run-engine");
	await window.getByRole("button", { name: "Use this engine" }).click();

	// The native folder picker cannot be clicked by Playwright; it answers with a fresh temp folder instead.
	await expect(window.getByTestId("first-run-sandbox")).toBeVisible();
	await stubOpenDialog(electronApp, pickedFolder);
	await window.getByRole("button", { name: "Choose a folder" }).click();
	await expect(window.getByTestId("sandbox-folder")).toContainText(pickedFolder.split("/").pop() ?? "");
	await window.getByRole("button", { name: "Use this folder" }).click();

	await expect(window.getByTestId("first-run-build")).toBeVisible();
	await withEngineLock(async () =>
	{
		await window.getByRole("button", { name: "Start the build" }).click();
		await expect(window.getByTestId("build-progress")).toHaveAttribute("data-phase", "building", { timeout: 60_000 });
		await saveScreenshot("03-first-run-building");
		await expect(window.getByTestId("build-succeeded")).toBeVisible({ timeout: SANDBOX_BUILD_TIMEOUT_MS });
	});
	await saveScreenshot("04-first-run-built");
	await window.getByRole("button", { name: "Continue" }).click();

	// The editor step would launch the windowed Unreal Editor; a learner may skip it, and the flow does.
	await expect(window.getByTestId("first-run-editor")).toBeVisible();
	await window.getByRole("button", { name: "Skip for now" }).click();
	await expect(window.getByTestId("first-run-done")).toBeVisible();
	await window.getByRole("button", { name: "Enter your studio" }).click();
	await expect(window.getByTestId("screen-studio")).toBeVisible();
	await saveScreenshot("05-studio-fresh");
}

/** Sets the review provider to Tests only, so no AI provider is called. */
async function chooseTestsOnlyReview(): Promise<void>
{
	await goTo("#/settings", "screen-settings");
	const testsOnly = window.getByRole("radiogroup", { name: "Review provider" }).getByRole("radio", { name: "Tests only" });
	await testsOnly.click();
	await expect(testsOnly).toHaveAttribute("aria-checked", "true");
}

/** Hovers the first glossary term inside `scope` until its hover card opens. */
async function hoverTerm(scope: Locator): Promise<void>
{
	const term = scope.getByTestId("glossary-term").first();

	await expect(async () =>
	{
		await window.mouse.move(5, 5);
		await term.hover();
		await expect(window.getByTestId("term-card")).toBeVisible({ timeout: 1_500 });
	}).toPass({ timeout: 15_000 });
}

/** A concept quest: a prediction (the right one, from the content), the card, every question answered, graded, then its loot. */
async function passConceptQuest(quest: WorldQuest, proofPrefix?: string): Promise<void>
{
	await openQuest(quest);

	const predict = window.getByTestId("predict-step");
	await answerQuestion(answers, predict.getByTestId("question"));
	if (proofPrefix) await saveScreenshot(`${proofPrefix}-predict`);
	await predict.getByRole("button", { name: "Lock in my guess" }).click();
	await expect(window.getByTestId("predict-reveal")).toBeVisible();
	await predict.getByRole("button", { name: "Read the card" }).click();

	const card = window.getByTestId("card-step");
	await expect(card).toBeVisible();

	if (proofPrefix)
	{
		await hoverTerm(card);
		await saveScreenshot(`${proofPrefix}-hover-term`);
		await window.mouse.move(5, 5);
	}

	await card.getByRole("button", { name: "Answer the questions" }).click();

	const questions = window.getByTestId("concept-question");
	await expect(questions.first()).toBeVisible();

	for (let index = 0; index < (await questions.count()); index++) await answerQuestion(answers, questions.nth(index).getByTestId("question"));

	await window.getByRole("button", { name: "Submit answers" }).click();
	await expect(window.getByTestId("concept-result")).toBeVisible({ timeout: 30_000 });
	if (proofPrefix) await saveScreenshot(`${proofPrefix}-results`);

	await window.getByRole("button", { name: "See your loot" }).click();
	await expect(window.getByTestId("screen-loot")).toHaveAttribute("data-passed", "true");
	if (proofPrefix) await saveScreenshot(`${proofPrefix}-loot`);
}

/** One due drill from the Studio, every item answered right from the content; returns how many items it had. */
async function runDrill(proofName?: string): Promise<number>
{
	await goTo("#/studio", "screen-studio");
	await window.getByTestId("start-drill").click();
	await expect(window.getByTestId("screen-drill")).toBeVisible();

	const position = await window.getByTestId("drill-position").innerText();
	const total = Number(/\/\s*(\d+)/.exec(position)?.[1] ?? "0");

	let explainItems = 0;

	for (let index = 0; index < total; index++)
	{
		const item = window.getByTestId("drill-item");

		if ((await item.getAttribute("data-source")) === "parsons") await answerParsons(answers, item);
		else if ((await answerQuestion(answers, item.getByTestId("question"))).type === "explain-in-one-sentence") explainItems++;

		await window.getByRole("button", { name: "Check" }).click();
		await expect(item.getByTestId("question-feedback")).toBeVisible({ timeout: 30_000 });
		if (proofName && index === 0) await saveScreenshot(`${proofName}-item`);
		await window.getByRole("button", { name: index === total - 1 ? "Finish the drill" : "Next" }).click();
	}

	const summary = window.getByTestId("drill-summary");
	await expect(summary).toBeVisible();
	if (proofName) await saveScreenshot(`${proofName}-summary`);

	// Every answer came from the content, so nothing should be reported as missed; today a self-checked explain item counts as a miss.
	if (explainItems > 0) await expectKnownFailure("M2.2b and M1.6g", "a drill answered right reports no item due for review", async () =>
	{
		await expect(summary).not.toContainText("due for review", { timeout: 1_000 });
	});

	return total;
}

/** Fills every self-explanation box of a worked build and opens the gaps, when the quest has the gate. */
async function explainMarkedLines(): Promise<void>
{
	const explanations = window.getByTestId("self-explanation");

	if ((await explanations.count()) === 0) return;

	if (!(await window.getByTestId("self-explanation-gate").isVisible())) await window.getByTestId("toggle-brief").click().catch(() => undefined);

	for (let index = 0; index < (await explanations.count()); index++) await explanations.nth(index).fill("This line lets the engine see and use the class safely");

	await window.getByTestId("open-gaps").click();
	await expect(window.getByTestId("self-explanation-gate")).toHaveAttribute("data-open", "true");
}

/** Waits until Monaco has drawn its lines inside the build quest. */
async function waitForEditor(): Promise<void>
{
	await expect(window.getByTestId("build-quest").locator(".monaco-editor .view-lines")).toBeVisible({ timeout: 30_000 });
}

/** Finds `text` in the Monaco editor with its find widget and leaves the match selected (the same keyboard path as the M2.2 spec). */
async function selectInEditor(text: string): Promise<void>
{
	const editor = window.getByTestId("build-quest").getByTestId("code-editor");

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

/** Runs the quest's tests (an incremental build plus a headless run) and waits for the verdict. */
async function runTests(expectedOk: boolean): Promise<void>
{
	await withEngineLock(async () =>
	{
		await window.getByTestId("run-button").click();
		await expect(window.getByTestId("run-result")).toHaveAttribute("data-ok", String(expectedOk), { timeout: ENGINE_RUN_TIMEOUT_MS });
	});
}

/** Submits the build and waits for its loot screen. */
async function submitBuild(): Promise<void>
{
	await withEngineLock(async () =>
	{
		await window.getByTestId("submit-button").click();
		await expect(window.getByTestId("screen-loot")).toBeVisible({ timeout: ENGINE_RUN_TIMEOUT_MS });
	});
}

/** The reference solution's files for a build quest (tools/solutions/<quest id>/, top-level files only). */
function referenceSolution(questId: string): Record<string, string>
{
	const folder = resolve("tools/solutions", questId);

	return Object.fromEntries(readdirSync(folder, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => [entry.name, readFileSync(join(folder, entry.name), "utf8")]));
}

/** A build quest the flow only needs passed on the way to the breakdown: the reference solution saved as the learner's draft, then Submit. */
async function passBuildWithReferenceSolution(quest: WorldQuest): Promise<void>
{
	await window.evaluate(`window.dojo.saveQuestDraft(${JSON.stringify({ questId: quest.id, files: referenceSolution(quest.id) })})`);

	// The renderer caches progress, and a draft saved straight through the bridge does not refresh that cache; a reload does.
	await window.reload();
	await window.waitForLoadState("domcontentloaded");
	await openQuest(quest);
	await waitForEditor();
	await explainMarkedLines();
	await submitBuild();

	// A failed reference build is a content or pipeline bug, not a learner mistake: show the compiler output it left on the quest screen.
	if ((await window.getByTestId("screen-loot").getAttribute("data-passed")) !== "true")
	{
		await window.getByTestId("loot-improve").click();
		await waitForEditor();
		const log = await window.getByTestId("build-quest").innerText();
		throw new Error(`${quest.id} did not pass with its reference solution. Quest screen after the submit:\n${log.slice(-4000)}`);
	}
}

/** The showcase build (the training dummy): Run fails on the starter, a hint is bought, both gaps are typed in Monaco, Run passes, Submit, loot. */
async function buildFailHintPass(): Promise<void>
{
	await openQuest(QUESTS.trainingDummy);
	await waitForEditor();
	await explainMarkedLines();

	await runTests(false);
	await expect(window.locator('[data-testid="test-row"][data-passed="false"]').first()).toBeVisible();
	await saveScreenshot("30-build-run-fails");

	await window.getByTestId("reveal-hint").click();
	await expect(window.getByTestId("hint-text")).toHaveCount(1);
	await saveScreenshot("31-build-hint");

	await window.getByTestId("file-tab").filter({ hasText: "DojoF1TrainingDummy.h" }).click();
	await selectInEditor("void Strike();");
	await window.keyboard.insertText('UFUNCTION(BlueprintCallable, Category = "Dummy")\nvoid Strike();');
	await window.getByTestId("file-tab").filter({ hasText: "DojoF1TrainingDummy.cpp" }).click();
	await selectInEditor("// Your code: do nothing if the dummy is already down; otherwise count the strike and refresh the label.");
	await window.keyboard.insertText("if (IsKnockedDown()) return;\nHitsTaken++;\nRefreshLabel();");
	await saveScreenshot("32-build-fixed-in-editor");

	await runTests(true);
	await expect(window.locator('[data-testid="test-row"][data-passed="false"]')).toHaveCount(0);
	await saveScreenshot("33-build-run-passes");

	await submitBuild();
	await expect(window.getByTestId("screen-loot")).toHaveAttribute("data-passed", "true");
	await expect(window.getByTestId("code-review")).toHaveAttribute("data-provider", "tests-only");
	await expect(window.getByTestId("unlocked")).toContainText(QUESTS.enums.title);
	await saveScreenshot("34-build-loot");

	await expectKnownFailure("M2.2b", "the loot screen lists each review date once", async () =>
	{
		await expect(window.getByTestId("screen-loot")).not.toContainText(/Next reviews.*\b(\w+), \1\b/, { timeout: 1_000 });
	});
}

/** The breakdown: the first plan, submitted, compared with the reference, revised with the two missing pieces and a note, graded. */
async function breakdownSubmitAndRevise(): Promise<void>
{
	await openQuest(QUESTS.dash);
	const workspace = window.getByTestId("breakdown-quest");
	await expect(workspace).toHaveAttribute("data-step", "plan");

	for (const piece of DASH_PLAN)
	{
		await window.getByTestId(`add-piece-${piece.kind}`).click();
		await window.getByTestId("piece-label").fill(piece.label);
		await window.getByTestId("piece-purpose").fill(piece.purpose);
	}

	await saveScreenshot("50-breakdown-plan");
	await window.getByTestId("submit-plan").click();
	await expect(workspace).toHaveAttribute("data-step", "compare", { timeout: 30_000 });
	await saveScreenshot("51-breakdown-compare");

	await window.getByTestId("add-piece-step").click();
	await window.getByTestId("piece-label").fill("Stop the dash on a blocking hit");
	await window.getByTestId("piece-purpose").fill("A launched character must not slide along a wall at dash speed");
	await window.getByTestId("add-piece-class").click();
	await window.getByTestId("piece-label").fill("HUD cooldown wedge that listens to the events");
	await window.getByTestId("piece-purpose").fill("Shows when the next dash is ready and proves the events work");
	await window.getByTestId("revision-note").fill("The reference showed the wall stop and the HUD wedge, so I added both as their own pieces.");
	await window.getByTestId("grade-revision").click();

	await expect(window.getByTestId("screen-loot")).toHaveAttribute("data-passed", "true", { timeout: 30_000 });
	await expect(window.getByTestId("breakdown-grade")).toBeVisible();
	await saveScreenshot("52-breakdown-loot");
}

test.describe("the learner flow against the real bridge and a real engine", () =>
{
	test.skip(!ENABLED, "Opt-in: set DOJO_E2E_ENGINE=1 (needs Unreal Engine; takes many minutes).");

	test("first run to a passed breakdown, then a restart that keeps everything", async ({ dojo, camera: testCamera }) =>
	{
		test.setTimeout(120 * 60_000);
		window = dojo.window;
		electronApp = dojo.electronApp;
		camera = testCamera;
		testInfo = test.info();
		answers = readAnswerKey();

		const pickedFolder = realpathSync(mkdtempSync(join(tmpdir(), "dojo-m2-4-sandbox-")));
		let finished = false;

		try
		{
			await window.emulateMedia({ reducedMotion: "reduce" });
			await setViewport(PROOF_SIZE.width, PROOF_SIZE.height);

			await firstRunSetup(pickedFolder);
			await chooseTestsOnlyReview();

			// Concept quests 1 to 4; the first one is shown in full: a prediction, a hover term, results, loot.
			await passConceptQuest(QUESTS.uobject, "10-concept");
			await expect(window.getByTestId("unlocked")).toContainText(QUESTS.reflection.title);
			await passConceptQuest(QUESTS.reflection);
			await passConceptQuest(QUESTS.uproperty);
			await passConceptQuest(QUESTS.ufunction);

			// A drill: the terms of the passed concept quests come back as practice.
			await runDrill("20-drill");

			// Every quest opens once the one before it is passed: terms only gate a quest when an earlier concept quest teaches them (A72).
			await expectUnlocked(QUESTS.trainingDummy);
			await buildFailHintPass();

			// The rest of World 1 up to the breakdown: concepts, and builds passed from their reference solutions.
			await passConceptQuest(QUESTS.enums);
			await passBuildWithReferenceSolution(QUESTS.popupTarget);
			await passConceptQuest(QUESTS.cast);
			await passBuildWithReferenceSolution(QUESTS.scoreKeeper);
			await passBuildWithReferenceSolution(QUESTS.practiceBell);
			await expectUnlocked(QUESTS.dash);

			await breakdownSubmitAndRevise();

			// The next quest unlocked: the boss opens once every build and the breakdown are passed.
			await expect(await stageNode(QUESTS.boss)).not.toHaveAttribute("data-status", "locked");
			await expect(await stageNode(QUESTS.trainingDummy)).toHaveAttribute("data-status", "passed");
			await saveScreenshot("60-map-boss-unlocked");

			// Restart on the same userData: the learner, the settings, the passed quests, and the paid hint all come back.
			await closeDojoKeepingData(dojo);
			const restarted = await launchDojo(dojo.userDataFolder);

			try
			{
				window = restarted.window;
				electronApp = restarted.electronApp;
				await window.emulateMedia({ reducedMotion: "reduce" });
				await setViewport(PROOF_SIZE.width, PROOF_SIZE.height);

				await goTo("#/", "screen-title");
				await expect(window.getByTestId("returning-start")).toContainText("Playtester");
				await saveScreenshot("70-restart-title");

				const passedNodes = window.locator('[data-testid="contract-card"][data-world="objects-and-reflection"] [data-testid="stage-node"][data-status="passed"]');
				await goTo("#/world-map", "screen-worldMap");
				await expect(passedNodes).toHaveCount(11);
				await saveScreenshot("71-restart-map");

				await goTo("#/settings", "screen-settings");
				await expect(window.getByRole("radiogroup", { name: "Review provider" }).getByRole("radio", { name: "Tests only" })).toHaveAttribute("aria-checked", "true");

				await openQuest(QUESTS.trainingDummy);
				await waitForEditor();
				await expect(window.getByTestId("hint-text")).toHaveCount(1);
				await saveScreenshot("72-restart-build-kept");

				// The marked-line explanations were written before the pass, so the gate should still be open after the restart.
				await expectKnownFailure("M1.6g", "self-explanations survive a restart", async () =>
				{
					await expect(window.getByTestId("self-explanation-gate")).toHaveAttribute("data-open", "true", { timeout: 2_000 });
				});
				finished = true;
			}
			finally
			{
				await restarted.electronApp.close();
			}
		}
		finally
		{
			// The fixture closes the first session after photographing a failure, and deletes its userData folder. A failed run keeps its sandbox.
			if (finished) rmSync(pickedFolder, { recursive: true, force: true });
			else console.log(`kept the sandbox for inspection: ${pickedFolder}`);
		}
	});
});
