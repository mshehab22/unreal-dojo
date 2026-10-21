// Real engine check of M1.3b: a Pack 1 World 1 quest through the real runQuest handler, with its prerequisites filled from reference solutions (A65), plus the snippet syntax check.
// Opt in with DOJO_ENGINE_ROOT=<engine root>; skipped otherwise, or when that folder has no engine (A187).
import { existsSync } from "node:fs";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { IPC_CHANNELS, type IpcResponse } from "@shared/ipc";
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
		? createUnrealServices({ templateFolder: join(REPOSITORY, "resources", "sandbox-template"), solutionsFolder: join(REPOSITORY, "tools", "solutions"), engineInspector: createEngineLocator(), settings, quests: catalog, isPassed: () => false })
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
				runRegistry: new RunRegistry(),
				sendProgress: (event) => events.push(event),
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
			expect.stringMatching(/^Using the reference solution for f1-training-dummy \(DojoF1TrainingDummy.cpp, DojoF1TrainingDummy.h\)/),
			expect.stringMatching(/^Using the reference solution for f1-popup-target \(DojoF1PopupTarget.cpp, DojoF1PopupTarget.h\)/),
		]));
	}, STEP_TIMEOUT_MS);

	it("checks a scratch buffer with the compiler: a clean reflected class passes, a typo is reported on its line", async () =>
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
	}, STEP_TIMEOUT_MS);
});
