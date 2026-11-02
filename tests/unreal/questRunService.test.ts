// Checks the run service: dependency parsing (A407), prerequisite filling from saved code, references, and boss overrides (A65, A401, A408, A409), lookups, and rebuilds.
import { describe, expect, it } from "vitest";

import type { PackOutline } from "@shared/types/catalog";
import type { AuthoredQuest } from "@shared/types/content";
import type { EngineInstall } from "@shared/types/engine";
import type { RunResult } from "@shared/types/run";

import { BuildFailureExplainer } from "../../src/main/services/unreal/BuildFailureExplainer";
import { FullBuildLedger } from "../../src/main/services/unreal/FullBuildLedger";
import { MacPlatformPaths } from "../../src/main/services/unreal/MacPlatformPaths";
import { PrerequisiteFiller } from "../../src/main/services/unreal/PrerequisiteFiller";
import type { ProgressUpdate } from "../../src/main/services/unreal/ProgressUpdate";
import { prerequisiteQuestIds } from "../../src/main/services/unreal/QuestDependencies";
import { QuestFileWriter } from "../../src/main/services/unreal/QuestFileWriter";
import { earlierQuestCode, QuestRunService } from "../../src/main/services/unreal/QuestRunService";
import { ReferenceSolutions } from "../../src/main/services/unreal/ReferenceSolutions";
import { AppErrorException } from "../../src/main/errors/AppErrorException";
import { RunnerFactory } from "../../src/main/services/unreal/RunnerFactory";
import { RunPreflight } from "../../src/main/services/unreal/RunPreflight";
import type { SandboxProjectService } from "../../src/main/services/unreal/SandboxProjectService";
import { FakeSandboxFileSystem } from "./FakeSandboxFileSystem";
import { MemoryUnrealSettings } from "./MemoryUnrealSettings";

/** Every quest id the fake content knows. */
const KNOWN_IDS = ["f1-training-dummy", "f1-popup-target", "f1-score-keeper", "f1-boss-training-yard", "f2-after-boss", "f1-popup", "f1-practice-bell", "f1-boss-director", "f2-target-rack"];

/** The score keeper's brief line, as World 1 writes it (A268). */
const SCORE_KEEPER_BRIEF = "Intro.\n\nCompiles against earlier quests: f1-training-dummy (`Quests/f1-training-dummy/DojoF1TrainingDummy.h`) and f1-popup-target (`Quests/f1-popup-target/DojoF1PopupTarget.h`).\n\nMore.";

/** A later quest that builds on a boss's extended piece. */
const AFTER_BOSS_BRIEF = "Compiles against earlier quests: f1-popup-target as extended by f1-boss-training-yard (`Quests/f1-boss-training-yard/DojoF1TrainingYard.h`).";

/** Where reference solutions live in these tests. */
const SOLUTIONS_ROOT = "/App/tools/solutions";

/** Reference solutions: two pieces and a boss with code, a test, and an override of the pop-up target. */
const SOLUTIONS = {
	[`${SOLUTIONS_ROOT}/f1-training-dummy/DojoF1TrainingDummy.h`]: "dummy h",
	[`${SOLUTIONS_ROOT}/f1-training-dummy/DojoF1TrainingDummy.cpp`]: "dummy cpp",
	[`${SOLUTIONS_ROOT}/f1-popup-target/DojoF1PopupTarget.h`]: "target h",
	[`${SOLUTIONS_ROOT}/f1-popup-target/DojoF1PopupTarget.cpp`]: "target cpp",
	[`${SOLUTIONS_ROOT}/f1-boss-training-yard/DojoF1TrainingYard.h`]: "yard h",
	[`${SOLUTIONS_ROOT}/f1-boss-training-yard/DojoF1TrainingYard.cpp`]: "yard cpp",
	[`${SOLUTIONS_ROOT}/f1-boss-training-yard/TrainingYard.Test.cpp`]: "yard tests",
	[`${SOLUTIONS_ROOT}/f1-boss-training-yard/f1-popup-target/DojoF1PopupTarget.h`]: "extended target h",
	[`${SOLUTIONS_ROOT}/f1-practice-bell/DojoF1PracticeBell.h`]: "bell h",
	[`${SOLUTIONS_ROOT}/f1-practice-bell/DojoF1PracticeBell.cpp`]: "bell cpp",
	[`${SOLUTIONS_ROOT}/f1-boss-director/DojoF1Director.h`]: "director h",
	[`${SOLUTIONS_ROOT}/f1-boss-director/DojoF1Director.cpp`]: "director cpp includes the bell",
	[`${SOLUTIONS_ROOT}/f1-boss-director/f1-popup-target/DojoF1PopupTarget.h`]: "director's target h",
};

/** The sandbox quest folder of a quest. */
function questFolder(questId: string): string
{
	return `/S/Source/Dojo/Quests/${questId}`;
}

/** A quest shaped enough for the service; a boss carries its dependency line in its spec. */
function quest(id: string, kind: "build" | "boss" | "concept", brief = "No dependencies."): AuthoredQuest
{
	return { id, title: id, kind, brief, spec: brief, tests: `IMPLEMENT_SIMPLE_AUTOMATION_TEST(F, "Dojo.F1.${id}.Works", Flags)`, files: [] } as unknown as AuthoredQuest;
}

/** The fake content: every known id in one world. */
const QUESTS = [
	quest("f1-training-dummy", "build"),
	quest("f1-popup-target", "build"),
	quest("f1-score-keeper", "build", SCORE_KEEPER_BRIEF),
	quest("f1-boss-training-yard", "boss"),
	quest("f2-after-boss", "build", AFTER_BOSS_BRIEF),
	quest("f1-practice-bell", "build"),
	quest("f1-boss-director", "boss", "Compiles against earlier quests: f1-popup-target (`Quests/f1-popup-target/DojoF1PopupTarget.h`) and f1-practice-bell (`Quests/f1-practice-bell/DojoF1PracticeBell.h`)."),
	quest("f2-target-rack", "build", "Compiles against earlier quests: f1-popup-target as extended by f1-boss-director (`Quests/f1-popup-target/DojoF1PopupTarget.h`)."),
	quest("c1", "concept"),
];

/** Options for one service. */
interface ServiceOptions
{
	passed?: string[];
	saved?: Record<string, Record<string, string>>;
	files?: Record<string, string>;
	settings?: MemoryUnrealSettings;
	ledger?: FullBuildLedger;

	/** Fields of the run result the fake runner answers with, over a passing result. */
	result?: Partial<RunResult>;

	/** The failure explainer the service is given, if any. */
	failureExplainer?: BuildFailureExplainer;

	/** How the fake engine locator answers; by default the engine is fine. */
	inspectEngine?: (folder: string) => Promise<EngineInstall>;
}

/** An engine the locator accepts. */
async function healthyEngine(folder: string): Promise<EngineInstall>
{
	return { path: folder, version: "5.8.3", source: "launcher", supportsFastLoop: true };
}

/** The service over fakes. */
function createService(options: ServiceOptions = {})
{
	const paths = new MacPlatformPaths("/Users/learner");
	const fileSystem = new FakeSandboxFileSystem({ ...SOLUTIONS, "/S/Dojo.uproject": "{}", ...(options.files ?? {}) });
	const settings = options.settings ?? new MemoryUnrealSettings("/Engines/UE", "/S");
	const writer = new QuestFileWriter(paths, fileSystem);
	const runs: { questId: string; files: Record<string, string>; sandboxFolder: string }[] = [];
	const result: RunResult = { ok: true, compiled: true, compilerOutput: "", tests: [], testsPassed: 0, testsTotal: 0, durationMs: 1, loop: "headless", ...(options.result ?? {}) };
	const runnerFactory = new RunnerFactory((context) => ({
		run: async (runQuest, files) =>
		{
			runs.push({ questId: runQuest.id, files, sandboxFolder: context.sandboxFolder });

			return result;
		},
	}));
	const packs = [{ id: "p", worlds: [{ id: "w", quests: KNOWN_IDS.map((id) => ({ id })) }] }] as unknown as PackOutline[];
	const rebuilds: string[] = [];

	const service = new QuestRunService({
		settings,
		preflight: new RunPreflight({ settings, paths, fileSystem, engineInspector: { inspectFolder: options.inspectEngine ?? healthyEngine } }),
		quests: { getAuthoredQuest: async (questId) => QUESTS.find((entry) => entry.id === questId), listPacks: async () => packs },
		runnerFactory,
		prerequisiteFiller: new PrerequisiteFiller(writer, new ReferenceSolutions(paths, fileSystem, SOLUTIONS_ROOT)),
		sandboxService: { rebuild: async (engineRoot: string, sandboxFolder: string) =>
		{
			rebuilds.push(`${engineRoot} ${sandboxFolder}`);

			return { ok: true, sandboxPath: sandboxFolder, durationMs: 1, compilerOutput: "" };
		} } as unknown as SandboxProjectService,
		snippetChecker: { check: async (engineRoot, sandboxFolder, code) => ({ ok: true, diagnostics: [{ line: 1, severity: "warning", message: `${engineRoot} ${sandboxFolder} ${code}` }] }) },
		learner: {
			isPassed: (questId) => (options.passed ?? []).includes(questId),
			savedFiles: (questId) => options.saved?.[questId] ?? {},
		},
		questFileWriter: writer,
		buildLedger: options.ledger ?? new FullBuildLedger(),
		...(options.failureExplainer ? { failureExplainer: options.failureExplainer } : {}),
	});

	return { service, fileSystem, runs, rebuilds };
}

/** Runs a quest and returns its progress lines. */
async function runAndCollect(service: QuestRunService, questId: string): Promise<string[]>
{
	const updates: ProgressUpdate[] = [];

	await service.runQuest(questId, { "Mine.h": "mine" }, (update) => updates.push(update), new AbortController().signal);

	return updates.map((update) => update.lastLine);
}

describe("prerequisiteQuestIds", () =>
{
	it("finds every known quest id on the dependency line as a whole word, in order", () =>
	{
		expect(prerequisiteQuestIds(SCORE_KEEPER_BRIEF, KNOWN_IDS)).toEqual(["f1-training-dummy", "f1-popup-target"]);
		expect(prerequisiteQuestIds(AFTER_BOSS_BRIEF, KNOWN_IDS)).toEqual(["f1-popup-target", "f1-boss-training-yard"]);
		expect(prerequisiteQuestIds("A brief that mentions f1-training-dummy elsewhere.", KNOWN_IDS)).toEqual([]);
	});

	it("does not match an id that is only part of a longer id", () =>
	{
		expect(prerequisiteQuestIds("Compiles against earlier quests: f1-popup-target.", KNOWN_IDS)).toEqual(["f1-popup-target"]);
	});
});

describe("PrerequisiteFiller through runQuest", () =>
{
	it("fills prerequisites the learner did not pass with their whole reference, names each file, then runs the learner's files", async () =>
	{
		const { service, fileSystem, runs } = createService();

		const lines = await runAndCollect(service, "f1-score-keeper");

		expect(fileSystem.files.get(`${questFolder("f1-training-dummy")}/DojoF1TrainingDummy.cpp`)).toBe("dummy cpp");
		expect(lines).toEqual([
			"Checking earlier quests this one compiles against: f1-training-dummy, f1-popup-target",
			"Filled f1-training-dummy because you have not passed it yourself (tested out or not done): DojoF1TrainingDummy.cpp from the reference solution, DojoF1TrainingDummy.h from the reference solution.",
			"Filled f1-popup-target because you have not passed it yourself (tested out or not done): DojoF1PopupTarget.cpp from the reference solution, DojoF1PopupTarget.h from the reference solution.",
		]);
		expect(runs).toEqual([{ questId: "f1-score-keeper", files: { "Mine.h": "mine" }, sandboxFolder: "/S" }]);
	});

	it("leaves a passed prerequisite with all its files alone", async () =>
	{
		const { service, fileSystem } = createService({
			passed: ["f1-training-dummy", "f1-popup-target"],
			saved: { "f1-training-dummy": { "DojoF1TrainingDummy.h": "saved h", "DojoF1TrainingDummy.cpp": "saved cpp" } },
			files: {
				[`${questFolder("f1-training-dummy")}/DojoF1TrainingDummy.h`]: "learner h",
				[`${questFolder("f1-training-dummy")}/DojoF1TrainingDummy.cpp`]: "learner cpp",
				[`${questFolder("f1-popup-target")}/DojoF1PopupTarget.h`]: "learner target h",
				[`${questFolder("f1-popup-target")}/DojoF1PopupTarget.cpp`]: "learner target cpp",
			},
		});

		const lines = await runAndCollect(service, "f1-score-keeper");

		expect(lines).toHaveLength(1);
		expect(fileSystem.writes.filter((path) => path.includes("Quests/f1-"))).toEqual([]);
	});

	it("fills a passed prerequisite's missing files from its saved code, never touching files that are there", async () =>
	{
		const { service, fileSystem } = createService({
			passed: ["f1-training-dummy", "f1-popup-target"],
			saved: { "f1-training-dummy": { "DojoF1TrainingDummy.h": "saved h", "DojoF1TrainingDummy.cpp": "saved cpp" } },
			files: {
				[`${questFolder("f1-training-dummy")}/DojoF1TrainingDummy.h`]: "learner h",
				[`${questFolder("f1-popup-target")}/DojoF1PopupTarget.h`]: "learner target h",
				[`${questFolder("f1-popup-target")}/DojoF1PopupTarget.cpp`]: "learner target cpp",
			},
		});

		const lines = await runAndCollect(service, "f1-score-keeper");

		expect(fileSystem.files.get(`${questFolder("f1-training-dummy")}/DojoF1TrainingDummy.h`)).toBe("learner h");
		expect(fileSystem.files.get(`${questFolder("f1-training-dummy")}/DojoF1TrainingDummy.cpp`)).toBe("saved cpp");
		expect(lines[1]).toBe("Filled f1-training-dummy because its files were missing from the sandbox: DojoF1TrainingDummy.cpp from your saved code.");
		expect(lines).toHaveLength(2);
	});

	it("uses the reference for a passed prerequisite's missing files only when nothing is saved", async () =>
	{
		const { service, fileSystem } = createService({
			passed: ["f1-training-dummy", "f1-popup-target"],
			files: {
				[`${questFolder("f1-training-dummy")}/DojoF1TrainingDummy.h`]: "learner h",
				[`${questFolder("f1-popup-target")}/DojoF1PopupTarget.h`]: "learner target h",
				[`${questFolder("f1-popup-target")}/DojoF1PopupTarget.cpp`]: "learner target cpp",
			},
		});

		const lines = await runAndCollect(service, "f1-score-keeper");

		expect(fileSystem.files.get(`${questFolder("f1-training-dummy")}/DojoF1TrainingDummy.h`)).toBe("learner h");
		expect(fileSystem.files.get(`${questFolder("f1-training-dummy")}/DojoF1TrainingDummy.cpp`)).toBe("dummy cpp");
		expect(lines[1]).toMatch(/DojoF1TrainingDummy.cpp from the reference solution\.$/);
	});

	it("after a boss reset, writes the boss's code without its tests and its piece overrides, which win over the piece's own files and reference in either order", async () =>
	{
		const brief = "Compiles against earlier quests: f1-boss-training-yard and f1-popup-target.";
		QUESTS.push(quest("f2-boss-first", "build", brief));
		KNOWN_IDS.push("f2-boss-first");

		for (const questId of ["f2-after-boss", "f2-boss-first"])
		{
			const { service, fileSystem } = createService({
				passed: ["f1-popup-target", "f1-boss-training-yard"],
				files: { [`${questFolder("f1-popup-target")}/DojoF1PopupTarget.h`]: "learner target h", [`${questFolder("f1-popup-target")}/DojoF1PopupTarget.cpp`]: "learner target cpp" },
			});

			const lines = await runAndCollect(service, questId);

			expect(fileSystem.files.get(`${questFolder("f1-boss-training-yard")}/DojoF1TrainingYard.cpp`)).toBe("yard cpp");
			expect(fileSystem.files.has(`${questFolder("f1-boss-training-yard")}/TrainingYard.Test.cpp`)).toBe(false);
			expect([...fileSystem.files.keys()].some((path) => path.startsWith("/S/Source/Dojo/Tests/"))).toBe(false);
			expect(fileSystem.files.get(`${questFolder("f1-popup-target")}/DojoF1PopupTarget.h`)).toBe("extended target h");
			expect(fileSystem.files.get(`${questFolder("f1-popup-target")}/DojoF1PopupTarget.cpp`)).toBe("learner target cpp");
			expect(lines).toContain("Filled f1-boss-training-yard because its files were missing from the sandbox, and the boss's reference needs its own versions of some pieces: DojoF1TrainingYard.cpp from the boss's reference solution, DojoF1TrainingYard.h from the boss's reference solution.");
			expect(lines).toContain("Filled f1-popup-target because the boss you build on extends this piece: DojoF1PopupTarget.h from the boss's reference solution.");
		}
	});

	it("an override wins even when the piece itself is filled from its reference", async () =>
	{
		const { service, fileSystem } = createService({ passed: ["f1-boss-training-yard"] });

		const lines = await runAndCollect(service, "f2-after-boss");

		expect(fileSystem.files.get(`${questFolder("f1-popup-target")}/DojoF1PopupTarget.h`)).toBe("extended target h");
		expect(fileSystem.files.get(`${questFolder("f1-popup-target")}/DojoF1PopupTarget.cpp`)).toBe("target cpp");
		expect(lines).toContain("Filled f1-popup-target because you have not passed it yourself (tested out or not done): DojoF1PopupTarget.cpp from the reference solution, DojoF1PopupTarget.h from the boss's reference solution.");
	});

	it("restores a reset boss from its saved code without overrides, and leaves a boss folder with files alone", async () =>
	{
		const saved = createService({
			passed: ["f1-popup-target", "f1-boss-training-yard"],
			saved: { "f1-boss-training-yard": { "MyYard.h": "my yard h", "MyYard.cpp": "my yard cpp" } },
			files: { [`${questFolder("f1-popup-target")}/DojoF1PopupTarget.h`]: "learner target h", [`${questFolder("f1-popup-target")}/DojoF1PopupTarget.cpp`]: "learner target cpp" },
		});
		const savedLines = await runAndCollect(saved.service, "f2-after-boss");

		expect(saved.fileSystem.files.get(`${questFolder("f1-boss-training-yard")}/MyYard.cpp`)).toBe("my yard cpp");
		expect(saved.fileSystem.files.get(`${questFolder("f1-popup-target")}/DojoF1PopupTarget.h`)).toBe("learner target h");
		expect(savedLines).toContain("Filled f1-boss-training-yard because its files were missing from the sandbox: MyYard.cpp from your saved code, MyYard.h from your saved code.");

		const present = createService({
			passed: ["f1-popup-target", "f1-boss-training-yard"],
			files: { [`${questFolder("f1-boss-training-yard")}/MyYard.h`]: "mine", [`${questFolder("f1-popup-target")}/DojoF1PopupTarget.h`]: "learner target h", [`${questFolder("f1-popup-target")}/DojoF1PopupTarget.cpp`]: "learner target cpp" },
		});
		const presentLines = await runAndCollect(present.service, "f2-after-boss");

		expect(presentLines).toHaveLength(1);
		expect(present.fileSystem.files.get(`${questFolder("f1-popup-target")}/DojoF1PopupTarget.h`)).toBe("learner target h");
	});

	it("brings a filled boss's own dependencies too, by the same rules: the director's bell comes from its reference, the learner's passed target keeps its .cpp, the override wins", async () =>
	{
		const { service, fileSystem } = createService({
			passed: ["f1-popup-target", "f1-boss-director"],
			files: { [`${questFolder("f1-popup-target")}/DojoF1PopupTarget.h`]: "learner target h", [`${questFolder("f1-popup-target")}/DojoF1PopupTarget.cpp`]: "learner target cpp" },
		});

		const lines = await runAndCollect(service, "f2-target-rack");

		expect(lines[0]).toBe("Checking earlier quests this one compiles against: f1-popup-target, f1-boss-director, f1-practice-bell");
		expect(fileSystem.files.get(`${questFolder("f1-practice-bell")}/DojoF1PracticeBell.cpp`)).toBe("bell cpp");
		expect(fileSystem.files.get(`${questFolder("f1-boss-director")}/DojoF1Director.cpp`)).toBe("director cpp includes the bell");
		expect(fileSystem.files.get(`${questFolder("f1-popup-target")}/DojoF1PopupTarget.h`)).toBe("director's target h");
		expect(fileSystem.files.get(`${questFolder("f1-popup-target")}/DojoF1PopupTarget.cpp`)).toBe("learner target cpp");
		expect(lines).toContain("Filled f1-practice-bell because you have not passed it yourself (tested out or not done): DojoF1PracticeBell.cpp from the reference solution, DojoF1PracticeBell.h from the reference solution.");
	});

	it("runs a quest without a dependency line straight away", async () =>
	{
		const { service, runs } = createService();

		expect(await runAndCollect(service, "f1-training-dummy")).toEqual([]);
		expect(runs).toHaveLength(1);
	});

	it("refuses an unknown quest, a quest without code, a missing sandbox, and a prerequisite without a reference solution", async () =>
	{
		const signal = new AbortController().signal;
		const { service } = createService();
		const { service: unset } = createService({ settings: new MemoryUnrealSettings() });

		await expect(service.runQuest("nope", {}, () => undefined, signal)).rejects.toMatchObject({ appError: { code: "quest-not-found" } });
		await expect(service.runQuest("c1", {}, () => undefined, signal)).rejects.toMatchObject({ appError: { code: "quest-not-found" } });
		await expect(unset.runQuest("f1-training-dummy", {}, () => undefined, signal)).rejects.toMatchObject({ appError: { code: "sandbox-not-ready" } });

		const paths = new MacPlatformPaths("/Users/learner");
		const fileSystem = new FakeSandboxFileSystem();
		const filler = new PrerequisiteFiller(new QuestFileWriter(paths, fileSystem), new ReferenceSolutions(paths, fileSystem, SOLUTIONS_ROOT));
		const facts = { isPassed: () => false, savedFiles: () => ({}), isBoss: (questId: string) => questId === "f1-ghost-boss" };

		await expect(filler.fill("/S", ["f1-ghost"], facts)).rejects.toThrow(/No reference solution for the earlier quest f1-ghost/);
		await expect(filler.fill("/S", ["f1-ghost-boss"], facts)).rejects.toThrow(/No reference solution for the earlier quest f1-ghost-boss/);
	});

	it("tells the listener about every folder it writes, whole or in part, so the fast loop's build record sees the sandbox change (M1.4)", async () =>
	{
		const paths = new MacPlatformPaths("/Users/learner");
		const fileSystem = new FakeSandboxFileSystem({ ...SOLUTIONS, [`${questFolder("f1-popup-target")}/DojoF1PopupTarget.h`]: "mine h" });
		const writes: [string, Record<string, string>, boolean][] = [];
		const ledger = new FullBuildLedger();
		const filler = new PrerequisiteFiller(new QuestFileWriter(paths, fileSystem), new ReferenceSolutions(paths, fileSystem, SOLUTIONS_ROOT), (questId, files, replaceFolder) =>
		{
			writes.push([questId, files, replaceFolder]);
			ledger.recordSandboxWrite(questId, files, replaceFolder);
		});
		const facts = { isPassed: (questId: string) => questId === "f1-popup-target", savedFiles: () => ({}), isBoss: () => false };

		await filler.fill("/S", ["f1-training-dummy", "f1-popup-target"], facts);

		expect(writes).toEqual([
			["f1-training-dummy", { "DojoF1TrainingDummy.h": "dummy h", "DojoF1TrainingDummy.cpp": "dummy cpp" }, true],
			["f1-popup-target", { "DojoF1PopupTarget.cpp": "target cpp" }, false],
		]);
		expect(ledger.sandboxChangedSinceBuild()).toBe(true);
	});

	it("removes a reset quest's folder and test from the sandbox and tells the build record; does nothing before setup (M1.4b)", async () =>
	{
		const ledger = new FullBuildLedger();
		const { service, fileSystem } = createService({ ledger, files: { [`${questFolder("f1-training-dummy")}/Dummy.h`]: "h", "/S/Source/Dojo/Tests/f1-training-dummy.Test.cpp": "tests" } });
		ledger.recordBuild("f1-training-dummy", { "Dummy.h": "h" }, "tests", 10);

		await service.removeQuestFiles("f1-training-dummy");

		expect(fileSystem.files.has(`${questFolder("f1-training-dummy")}/Dummy.h`)).toBe(false);
		expect(fileSystem.files.has("/S/Source/Dojo/Tests/f1-training-dummy.Test.cpp")).toBe(false);
		expect(ledger.sandboxChangedSinceBuild()).toBe(true);

		const { service: unset } = createService({ settings: new MemoryUnrealSettings() });
		await expect(unset.removeQuestFiles("f1-training-dummy")).resolves.toBeUndefined();
	});

	it("checks a snippet and rebuilds with the engine and sandbox from settings", async () =>
	{
		const { service, rebuilds } = createService();

		expect((await service.checkSnippetSyntax("int x;")).diagnostics[0]?.message).toBe("/Engines/UE /S int x;");

		await service.rebuildSandbox(() => undefined, new AbortController().signal);
		expect(rebuilds).toEqual(["/Engines/UE /S"]);
	});

	describe("preflight (M5.1e)", () =>
	{
		const signal = new AbortController().signal;

		/** The three calls that need the engine and sandbox, each as a function of the service. */
		const calls: [string, (service: QuestRunService) => Promise<unknown>][] = [
			["runQuest", (service) => service.runQuest("f1-training-dummy", { "Mine.h": "mine" }, () => undefined, signal)],
			["checkSnippetSyntax", (service) => service.checkSnippetSyntax("int x;")],
			["rebuildSandbox", (service) => service.rebuildSandbox(() => undefined, signal)],
		];

		/** The engine folder was renamed or uninstalled: the locator cannot read it any more. */
		function engineGone(): Promise<EngineInstall>
		{
			return Promise.reject(new AppErrorException("engine-not-found", "That folder does not look like an Unreal Engine install.", "Pick the folder that contains the Engine folder.", "No Engine/Build/Build.version under /Engines/UE"));
		}

		it.each(calls)("%s rejects with the friendly engine-moved error, naming the path, when the engine folder is gone", async (_name, call) =>
		{
			const { service, runs, rebuilds } = createService({ inspectEngine: engineGone });

			const outcome = call(service);

			await expect(outcome).rejects.toBeInstanceOf(AppErrorException);
			await expect(outcome).rejects.toMatchObject({ appError: { code: "engine-not-found", message: expect.stringMatching(/could not be found at \/Engines\/UE.*drive is not connected/), suggestedAction: expect.stringContaining("Pick the engine folder again in Settings") } });
			expect(runs).toEqual([]);
			expect(rebuilds).toEqual([]);
		});

		it.each(calls)("%s turns a raw ENOENT from the locator into the same friendly error and keeps the raw text only as detail", async (_name, call) =>
		{
			const { service } = createService({ inspectEngine: () => Promise.reject(new Error("ENOENT: no such file or directory, open '/Engines/UE/Engine/Build/Build.version'")) });

			const outcome = call(service);

			await expect(outcome).rejects.toMatchObject({ appError: { code: "engine-not-found", message: expect.not.stringContaining("ENOENT"), detail: expect.stringContaining("ENOENT") } });
		});

		it.each(calls)("%s keeps the unsupported-version error of an engine that is too old", async (_name, call) =>
		{
			const tooOld = new AppErrorException("engine-version-unsupported", "Unreal Engine 5.3 is too old.", "Install a newer one.");
			const { service } = createService({ inspectEngine: () => Promise.reject(tooOld) });

			await expect(call(service)).rejects.toMatchObject({ appError: { code: "engine-version-unsupported" } });
		});

		it.each(calls)("%s rejects with sandbox-not-ready, saying the project could not be found (moved, deleted, or its drive gone) and to put the folder back, when Dojo.uproject is gone", async (_name, call) =>
		{
			const { service, fileSystem, runs, rebuilds } = createService();
			fileSystem.files.delete("/S/Dojo.uproject");

			const outcome = call(service);

			await expect(outcome).rejects.toMatchObject({ appError: { code: "sandbox-not-ready", message: expect.stringMatching(/could not be found.*moved, renamed or deleted.*drive is not connected/), suggestedAction: expect.stringContaining("Put the folder back where it was") } });
			await expect(outcome).rejects.toMatchObject({ appError: { message: expect.stringContaining("/S") } });
			expect(runs).toEqual([]);
			expect(rebuilds).toEqual([]);
		});

		it("checks the engine before the sandbox, so a learner with both gone is told about the engine", async () =>
		{
			const { service, fileSystem } = createService({ inspectEngine: engineGone });
			fileSystem.files.delete("/S/Dojo.uproject");

			await expect(service.runQuest("f1-training-dummy", {}, () => undefined, signal)).rejects.toMatchObject({ appError: { code: "engine-not-found" } });
		});

		it("checks setup first: no saved engine or sandbox still says the sandbox is not set up", async () =>
		{
			const { service } = createService({ settings: new MemoryUnrealSettings("/Engines/UE", null) });

			await expect(service.checkSnippetSyntax("int x;")).rejects.toMatchObject({ appError: { code: "sandbox-not-ready", message: expect.stringContaining("not been set up") } });
		});

		it("lets a healthy engine and sandbox through to the run", async () =>
		{
			const { service, runs } = createService();

			await expect(service.runQuest("f1-training-dummy", { "Mine.h": "mine" }, () => undefined, signal)).resolves.toMatchObject({ ok: true });
			expect(runs).toHaveLength(1);
		});
	});
});

/** A compile error line in a quest folder of the fake sandbox, in the clang shape. */
function errorIn(questId: string): string
{
	return `/S/Source/Dojo/Quests/${questId}/Broken.h:9:3: error: expected ';' at end of declaration list`;
}

/** An explainer over a toolchain that is fine and an engine that inspects fine. */
function healthyExplainer(): { explainer: BuildFailureExplainer; toolchainChecks: () => number }
{
	let checks = 0;
	const explainer = new BuildFailureExplainer({
		checkToolchain: async () =>
		{
			checks++;

			return { ok: true, tool: "xcode-select", message: "Xcode is ready.", problems: [] };
		},
		inspectEngine: async () => ({ path: "/Engines/UE", version: "5.8.3", source: "launcher", supportsFastLoop: true }),
	});

	return { explainer, toolchainChecks: () => checks };
}

describe("unrelated failures on a run (M5.1d)", () =>
{
	const failedCompile = { ok: false, compiled: false };

	it("attaches a lesson-bug failure when an earlier quest filled from a reference solution breaks the build", async () =>
	{
		const { explainer } = healthyExplainer();
		const { service } = createService({ failureExplainer: explainer, result: { ...failedCompile, compilerOutput: errorIn("f1-training-dummy") } });

		const result = await service.runQuest("f1-score-keeper", { "Mine.h": "mine" }, () => undefined, new AbortController().signal);

		expect(result.unrelatedFailure?.message).toContain("bug in the lesson");
		expect(result.unrelatedFailure?.detail).toContain("f1-training-dummy");
		expect(result.ok).toBe(false);
	});

	it("attaches an open-or-reset failure when an earlier quest the learner passed and saved breaks the build", async () =>
	{
		const { explainer } = healthyExplainer();
		const { service } = createService({
			failureExplainer: explainer,
			passed: ["f1-training-dummy", "f1-popup-target"],
			files: {
				[`${questFolder("f1-training-dummy")}/DojoF1TrainingDummy.h`]: "learner h",
				[`${questFolder("f1-training-dummy")}/DojoF1TrainingDummy.cpp`]: "learner cpp",
				[`${questFolder("f1-popup-target")}/DojoF1PopupTarget.h`]: "learner target h",
				[`${questFolder("f1-popup-target")}/DojoF1PopupTarget.cpp`]: "learner target cpp",
			},
			result: { ...failedCompile, compilerOutput: errorIn("f1-training-dummy") },
		});

		const result = await service.runQuest("f1-score-keeper", {}, () => undefined, new AbortController().signal);

		expect(result.unrelatedFailure?.suggestedAction).toContain("Open f1-training-dummy");
	});

	it("leaves the result alone for an error in the quest itself, a passing run, a failed test, and no explainer", async () =>
	{
		const { explainer, toolchainChecks } = healthyExplainer();
		const own = { ...failedCompile, compilerOutput: errorIn("f1-score-keeper") };

		const cases = [
			createService({ failureExplainer: explainer, result: own }),
			createService({ failureExplainer: explainer }),
			createService({ failureExplainer: explainer, result: { ok: false, compiled: true, testsTotal: 1 } }),
			createService({ result: { ...failedCompile, compilerOutput: errorIn("f1-training-dummy") } }),
		];

		for (const { service } of cases)
		{
			const result = await service.runQuest("f1-score-keeper", {}, () => undefined, new AbortController().signal);

			expect(result.unrelatedFailure).toBeUndefined();
		}

		expect(toolchainChecks()).toBe(0);
	});

	it("passes a pipeline error through the explainer and survives an explainer that throws", async () =>
	{
		const { explainer } = healthyExplainer();
		const timedOut = { ...failedCompile, error: "The build took longer than 15 minutes and was stopped." };

		const ran = await createService({ failureExplainer: explainer, result: timedOut }).service.runQuest("f1-training-dummy", {}, () => undefined, new AbortController().signal);
		expect(ran.unrelatedFailure?.message).toContain("longer than its time limit");

		const throwing = { explainRun: () => Promise.reject(new Error("explainer bug")) } as unknown as BuildFailureExplainer;
		const survived = await createService({ failureExplainer: throwing, result: timedOut }).service.runQuest("f1-training-dummy", {}, () => undefined, new AbortController().signal);

		expect(survived.error).toBe(timedOut.error);
		expect(survived.unrelatedFailure).toBeUndefined();
	});
});

describe("earlierQuestCode", () =>
{
	it("marks a prerequisite as a reference solution only when every file the filler wrote came from one", () =>
	{
		const filled = [
			{ questId: "a", reason: "r", files: [{ name: "A.h", source: "the reference solution" as const }] },
			{ questId: "b", reason: "r", files: [{ name: "B.h", source: "your saved code" as const }, { name: "B.cpp", source: "the reference solution" as const }] },
			{ questId: "c", reason: "r", files: [{ name: "C.h", source: "the boss's reference solution" as const }] },
		];

		expect(earlierQuestCode(["a", "b", "c", "d"], filled)).toEqual([
			{ questId: "a", origin: "reference-solution" },
			{ questId: "b", origin: "saved-code" },
			{ questId: "c", origin: "reference-solution" },
			{ questId: "d", origin: "saved-code" },
		]);
	});
});
