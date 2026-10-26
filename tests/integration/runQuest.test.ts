// Real engine check of M1.3b: a Pack 1 World 1 quest through the real runQuest handler, with its prerequisites filled from reference solutions (A65), plus the snippet syntax check.
// Opt in with DOJO_ENGINE_ROOT=<engine root>; skipped otherwise, or when that folder has no engine (A187).
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { IPC_CHANNELS, type IpcResponse } from "@shared/ipc";
import type { PackOutline } from "@shared/types/catalog";
import type { AuthoredQuest } from "@shared/types/content";
import type { BuildProgressEvent, RunResult, SyntaxCheckResult } from "@shared/types/run";

import { createContentCatalog } from "../../src/main/content/createContentCatalog";
import { createHandlers } from "../../src/main/ipc/createHandlers";
import { registerHandlers, type WrappedHandler } from "../../src/main/ipc/registerHandlers";
import { createEngineLocator } from "../../src/main/services/unreal/createEngineLocator";
import { createUnrealServices } from "../../src/main/services/unreal/createUnrealServices";
import { RunRegistry } from "../../src/main/services/unreal/RunRegistry";
import { MemoryUnrealSettings } from "../unreal/MemoryUnrealSettings";

/** The engine to test against, from the environment. */
const ENGINE_ROOT = process.env.DOJO_ENGINE_ROOT ?? "";

/** True when an engine is present at that root. */
const HAS_ENGINE = ENGINE_ROOT !== "" && existsSync(join(ENGINE_ROOT, "Engine", "Build", "Build.version"));

/** The repository root. */
const REPOSITORY = join(__dirname, "..", "..");

/** Long enough for a cold build and a headless editor start. */
const STEP_TIMEOUT_MS = 10 * 60 * 1000;

/** The quest under test: it compiles against f1-training-dummy and f1-popup-target. */
const QUEST_ID = "f1-score-keeper";

/** Reads a reference solution folder as a learner's file map. */
async function solutionFiles(questId: string): Promise<Record<string, string>>
{
	const folder = join(REPOSITORY, "tools", "solutions", questId);
	const files: Record<string, string> = {};

	for (const fileName of await readdir(folder)) files[fileName] = await readFile(join(folder, fileName), "utf8");

	return files;
}

describe.skipIf(!HAS_ENGINE)(`runQuest against ${ENGINE_ROOT || "no engine"}`, () =>
{
	let pickedFolder = "";
	const events: BuildProgressEvent[] = [];
	const settings = new MemoryUnrealSettings();
	const catalog = createContentCatalog(join(REPOSITORY, "content"));
	const services = HAS_ENGINE
		? createUnrealServices({ templateFolder: join(REPOSITORY, "resources", "sandbox-template"), solutionsFolder: join(REPOSITORY, "tools", "solutions"), engineInspector: createEngineLocator(), settings, quests: catalog, learner: { isPassed: () => false, savedFiles: () => ({}) } })
		: null;
	const handlersByChannel = new Map<string, WrappedHandler>();

	if (services)
	{
		registerHandlers(
			{ handle: (channel, listener) => void handlersByChannel.set(channel, listener as WrappedHandler) },
			createHandlers({
				getAppVersion: () => "test",
				getEngineLocator: () => { throw new Error("not used"); },
				getContentCatalog: () => catalog,
				pickFolder: async () => null,
				progressService: {} as never,
				getSandboxService: () => services.sandboxService,
				getQuestRunService: () => services.questRunService,
				getEditorService: () => services.editorService,
				runRegistry: new RunRegistry(),
				sendProgress: (event) => events.push(event),
				progressContentService: { assertQuestOpen: async () => undefined } as never,
				settingsService: {} as never,
				readEnvironmentStatus: () => { throw new Error("not used"); },
				getReviewHandlers: () => { throw new Error("not used"); },
			}),
		);
	}

	/** Calls one IPC channel like the preload does. */
	const invoke = <Value>(channel: string, ...methodArguments: unknown[]): Promise<IpcResponse<Value>> => handlersByChannel.get(channel)!({} as Parameters<WrappedHandler>[0], ...methodArguments) as Promise<IpcResponse<Value>>;

	afterAll(async () =>
	{
		if (pickedFolder !== "") await rm(pickedFolder, { recursive: true, force: true });
	});

	it("creates the sandbox through createSandbox, which saves the engine and sandbox folders", async () =>
	{
		pickedFolder = await mkdtemp(join(tmpdir(), "dojo-runquest-"));

		const response = await invoke(IPC_CHANNELS.createSandbox, { runId: "setup-1", enginePath: ENGINE_ROOT, folder: pickedFolder });

		expect(response).toMatchObject({ ok: true, value: { ok: true } });
		expect(settings.getEnginePath()).toBe(ENGINE_ROOT);
		expect(settings.getSandboxPath()).toMatch(/DojoSandbox$/);
	}, STEP_TIMEOUT_MS);

	it("runs the score keeper through runQuest: prerequisites come from reference solutions, the build passes, its tests pass", async () =>
	{
		events.length = 0;
		const startedAt = Date.now();

		const response = await invoke<RunResult>(IPC_CHANNELS.runQuest, { runId: "run-1", questId: QUEST_ID, files: await solutionFiles(QUEST_ID) });

		console.log(`runQuest ${QUEST_ID}: ${Date.now() - startedAt} ms`);
		console.log(events.filter((event) => event.phase === "preparing" || event.phase === "writing").map((event) => event.lastLine).join("\n"));
		console.log(JSON.stringify(response, null, 2));

		expect(response.ok).toBe(true);
		if (!response.ok) return;
		expect(response.value).toMatchObject({ ok: true, compiled: true, loop: "headless" });
		expect(response.value.testsTotal).toBeGreaterThan(0);
		expect(response.value.tests.every((test) => test.name.startsWith("Dojo.F1.ScoreKeeper."))).toBe(true);
		expect(events.every((event) => event.runId === "run-1")).toBe(true);
		expect(events.map((event) => event.lastLine)).toEqual(expect.arrayContaining([
			"Filled f1-training-dummy because you have not passed it yourself (tested out or not done): DojoF1TrainingDummy.cpp from the reference solution, DojoF1TrainingDummy.h from the reference solution.",
			"Filled f1-popup-target because you have not passed it yourself (tested out or not done): DojoF1PopupTarget.cpp from the reference solution, DojoF1PopupTarget.h from the reference solution.",
		]));
	}, STEP_TIMEOUT_MS);

	it("builds on a reset fixture boss: the boss's code without its tests, its piece override, and its own dependency (the bell) land in the sandbox, and the later quest passes", async () =>
	{
		// A fixture boss until World 2's boss solution lands: it extends f1-popup-target with a field, and its integration reads it.
		const solutionsFolder = join(pickedFolder, "fixture-solutions");
		await cp(join(REPOSITORY, "tools", "solutions", "f1-popup-target"), join(solutionsFolder, "f1-popup-target"), { recursive: true });
		await cp(join(REPOSITORY, "tools", "solutions", "f1-practice-bell"), join(solutionsFolder, "f1-practice-bell"), { recursive: true });
		const pieceHeader = await readFile(join(solutionsFolder, "f1-popup-target", "DojoF1PopupTarget.h"), "utf8");
		const extendedHeader = pieceHeader.replace("int32 HitsToBreak = 2;", "int32 HitsToBreak = 2;\n\n\t/** Fixture boss extension. */\n\tint32 BonusPoints = 7;");
		expect(extendedHeader).not.toBe(pieceHeader);

		const bossFolder = join(solutionsFolder, "fx-boss-yard");
		await mkdir(join(bossFolder, "f1-popup-target"), { recursive: true });
		await writeFile(join(bossFolder, "f1-popup-target", "DojoF1PopupTarget.h"), extendedHeader);
		await writeFile(join(bossFolder, "DojoFxYard.h"), "#pragma once\n\n#include \"CoreMinimal.h\"\n\n/** The fixture boss's bonus, read from the extended target. */\nint32 DojoFxYardBonus();\n");
		await writeFile(join(bossFolder, "DojoFxYard.cpp"), "#include \"DojoFxYard.h\"\n\n#include \"DojoF1PopupTarget.h\"\n#include \"DojoF1PracticeBell.h\"\n\nint32 DojoFxYardBonus()\n{\n\t// The bell is the boss's own dependency (A413): it only compiles if the bell's files were brought in too.\n\treturn GetDefault<ADojoF1PopupTarget>()->BonusPoints + (GetDefault<ADojoF1PracticeBell>() != nullptr ? 1 : 0);\n}\n");
		await writeFile(join(bossFolder, "FxYard.Test.cpp"), "// Must never be written into the sandbox.\n#error boss tests were written\n");

		const afterQuest = {
			id: "fx-after-yard",
			title: "After the yard",
			kind: "build",
			brief: "Compiles against earlier quests: f1-popup-target as extended by fx-boss-yard (`Quests/fx-boss-yard/DojoFxYard.h`).",
			files: [],
			tests: [
				"#include \"Misc/AutomationTest.h\"",
				"#if WITH_AUTOMATION_TESTS",
				"#include \"DojoFxYard.h\"",
				"IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_Fx_AfterYard_Bonus, \"Dojo.Fx.AfterYard.Bonus\", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)",
				"bool FDojo_Fx_AfterYard_Bonus::RunTest(const FString& Parameters)",
				"{",
				"\tTestEqual(TEXT(\"Bonus from the extended target\"), DojoFxYardBonus(), 8);",
				"\treturn true;",
				"}",
				"#endif",
				"",
			].join("\n"),
		} as unknown as AuthoredQuest;
		const bossQuest = { id: "fx-boss-yard", kind: "boss", spec: "Compiles against earlier quests: f1-popup-target (`Quests/f1-popup-target/DojoF1PopupTarget.h`) and f1-practice-bell (`Quests/f1-practice-bell/DojoF1PracticeBell.h`)." } as unknown as AuthoredQuest;
		const fixtureQuests = [afterQuest, bossQuest];
		const fixturePack = { id: "fx", worlds: [{ id: "fx-world", quests: [{ id: "fx-after-yard" }, { id: "fx-boss-yard" }] }] } as unknown as PackOutline;

		const fixtureServices = createUnrealServices({
			templateFolder: join(REPOSITORY, "resources", "sandbox-template"),
			solutionsFolder,
			engineInspector: createEngineLocator(),
			settings,
			quests: {
				getAuthoredQuest: async (questId) => fixtureQuests.find((entry) => entry.id === questId) ?? catalog.getAuthoredQuest(questId),
				listPacks: async () => [...(await catalog.listPacks()), fixturePack],
			},
			learner: { isPassed: (questId) => questId === "fx-boss-yard" || questId === "f1-popup-target", savedFiles: () => ({}) },
		});

		// The score keeper run left reference copies of the pieces; a reset removes the pop-up target's files.
		const sandboxFolder = settings.getSandboxPath() ?? "";
		await rm(join(sandboxFolder, "Source", "Dojo", "Quests", "f1-popup-target"), { recursive: true, force: true });
		await rm(join(sandboxFolder, "Source", "Dojo", "Quests", "f1-score-keeper"), { recursive: true, force: true });
		await rm(join(sandboxFolder, "Source", "Dojo", "Tests", "f1-score-keeper.Test.cpp"), { force: true });

		const lines: string[] = [];
		const startedAt = Date.now();
		const result = await fixtureServices.questRunService.runQuest("fx-after-yard", { "DojoFxAfter.h": "#pragma once\n" }, (update) => lines.push(update.lastLine), new AbortController().signal);
		console.log(`fixture boss run: ${Date.now() - startedAt} ms\n${lines.filter((line) => line.startsWith("Filled")).join("\n")}\n${JSON.stringify(result.tests)}\n${result.compilerOutput}`);

		expect(result).toMatchObject({ ok: true, compiled: true, testsPassed: 1, testsTotal: 1 });
		expect(lines).toContain("Filled fx-boss-yard because its files were missing from the sandbox, and the boss's reference needs its own versions of some pieces: DojoFxYard.cpp from the boss's reference solution, DojoFxYard.h from the boss's reference solution.");
		expect(lines).toContain("Filled f1-popup-target because its files were missing from the sandbox: DojoF1PopupTarget.cpp from the reference solution, DojoF1PopupTarget.h from the boss's reference solution.");
		expect(lines).toContain("Filled f1-practice-bell because you have not passed it yourself (tested out or not done): DojoF1PracticeBell.cpp from the reference solution, DojoF1PracticeBell.h from the reference solution.");
		expect(existsSync(join(sandboxFolder, "Source", "Dojo", "Quests", "fx-boss-yard", "FxYard.Test.cpp"))).toBe(false);
		expect(existsSync(join(sandboxFolder, "Source", "Dojo", "Tests", "fx-boss-yard.Test.cpp"))).toBe(false);

		await fixtureServices.questFileWriter.remove(sandboxFolder, "fx-after-yard");
		await fixtureServices.questFileWriter.remove(sandboxFolder, "fx-boss-yard");
	}, STEP_TIMEOUT_MS);

	it("checks a scratch buffer with the compiler: a clean reflected class passes, a typo is reported on its line, a header error is mapped and fails", async () =>
	{
		const clean = ["#pragma once", "#include \"GameFramework/Actor.h\"", "#include \"Lantern.generated.h\"", "UCLASS()", "class ALantern : public AActor", "{", "\tGENERATED_BODY()", "public:", "\tUPROPERTY(EditAnywhere)", "\tfloat Brightness = 5.f;", "\tvirtual void BeginPlay() override { Super::BeginPlay(); }", "};", ""].join("\n");
		const typo = clean.replace("float Brightness", "flot Brightness");

		const startedAt = Date.now();
		const passing = await invoke<SyntaxCheckResult>(IPC_CHANNELS.checkSnippetSyntax, { questId: "f1-concept", code: clean });
		const failing = await invoke<SyntaxCheckResult>(IPC_CHANNELS.checkSnippetSyntax, { questId: "f1-concept", code: typo });
		console.log(`two syntax checks: ${Date.now() - startedAt} ms`, JSON.stringify(failing));

		expect(passing).toEqual({ ok: true, value: { ok: true, diagnostics: [] } });
		expect(failing.ok && failing.value.ok).toBe(false);
		expect(failing.ok && failing.value.diagnostics[0]).toMatchObject({ line: 10, severity: "error", message: expect.stringMatching(/flot/) });

		const incomplete = ["#include \"CoreMinimal.h\"", "struct FThing;", "void Make()", "{", "\tTSharedRef<FThing> Thing = MakeShared<FThing>();", "}", ""].join("\n");
		const headerError = await invoke<SyntaxCheckResult>(IPC_CHANNELS.checkSnippetSyntax, { questId: "f1-concept", code: incomplete });
		console.log(JSON.stringify(headerError));

		expect(headerError.ok && headerError.value.ok).toBe(false);
		expect(headerError.ok && headerError.value.diagnostics.length > 0 && headerError.value.diagnostics.every((diagnostic) => diagnostic.severity === "error" && diagnostic.line === 5)).toBe(true);
	}, STEP_TIMEOUT_MS);
});
