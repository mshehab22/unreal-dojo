// Checks the run service: prerequisite parsing and filling (A65), quest and sandbox lookups, the snippet check, and rebuilds.
import { describe, expect, it } from "vitest";

import type { AuthoredQuest } from "@shared/types/content";
import type { RunResult } from "@shared/types/run";

import { ClangSnippetSyntaxChecker, parseDiagnostics, prepareSnippet, snippetResponseFile } from "../../src/main/services/unreal/ClangSnippetSyntaxChecker";
import { MacPlatformPaths } from "../../src/main/services/unreal/MacPlatformPaths";
import { PrerequisiteFiller } from "../../src/main/services/unreal/PrerequisiteFiller";
import type { ProgressUpdate } from "../../src/main/services/unreal/ProgressUpdate";
import { prerequisiteQuestIds } from "../../src/main/services/unreal/QuestDependencies";
import { QuestFileWriter } from "../../src/main/services/unreal/QuestFileWriter";
import { QuestRunService } from "../../src/main/services/unreal/QuestRunService";
import { ReferenceSolutions } from "../../src/main/services/unreal/ReferenceSolutions";
import { RunnerFactory } from "../../src/main/services/unreal/RunnerFactory";
import type { SandboxProjectService } from "../../src/main/services/unreal/SandboxProjectService";
import { FakeCommandRunner } from "./FakeCommandRunner";
import { FakeSandboxFileSystem } from "./FakeSandboxFileSystem";
import { MemoryUnrealSettings } from "./MemoryUnrealSettings";

/** The score keeper's brief line, as World 1 writes it (A268). */
const SCORE_KEEPER_BRIEF = "Intro.\n\nCompiles against earlier quests: f1-training-dummy (`Quests/f1-training-dummy/DojoF1TrainingDummy.h`) and f1-popup-target (`Quests/f1-popup-target/DojoF1PopupTarget.h`).\n\nMore.";

/** Reference solutions for the two prerequisites. */
const SOLUTIONS = {
	"/App/tools/solutions/f1-training-dummy/DojoF1TrainingDummy.h": "dummy h",
	"/App/tools/solutions/f1-training-dummy/DojoF1TrainingDummy.cpp": "dummy cpp",
	"/App/tools/solutions/f1-popup-target/DojoF1PopupTarget.h": "target h",
	"/App/tools/solutions/f1-popup-target/DojoF1PopupTarget.cpp": "target cpp",
};

/** A build quest shaped enough for the service. */
function buildQuest(id: string, brief: string): AuthoredQuest
{
	return { id, title: id, kind: "build", brief, tests: `IMPLEMENT_SIMPLE_AUTOMATION_TEST(F, "Dojo.F1.${id}.Works", Flags)`, files: [] } as unknown as AuthoredQuest;
}

/** The service over fakes; `passed` lists quests the learner passed. */
function createService(options: { passed?: string[]; files?: Record<string, string>; settings?: MemoryUnrealSettings } = {})
{
	const paths = new MacPlatformPaths("/Users/learner");
	const fileSystem = new FakeSandboxFileSystem({ ...SOLUTIONS, ...(options.files ?? {}) });
	const writer = new QuestFileWriter(paths, fileSystem);
	const runs: { questId: string; files: Record<string, string>; sandboxFolder: string }[] = [];
	const result: RunResult = { ok: true, compiled: true, compilerOutput: "", tests: [], testsPassed: 0, testsTotal: 0, durationMs: 1, loop: "headless" };
	const runnerFactory = new RunnerFactory((context) => ({
		run: async (quest, files) =>
		{
			runs.push({ questId: quest.id, files, sandboxFolder: context.sandboxFolder });

			return result;
		},
	}));
	const quests = [buildQuest("f1-score-keeper", SCORE_KEEPER_BRIEF), buildQuest("f1-training-dummy", "No dependencies."), { id: "c1", kind: "concept" } as unknown as AuthoredQuest];
	const rebuilds: string[] = [];

	const service = new QuestRunService({
		settings: options.settings ?? new MemoryUnrealSettings("/Engines/UE", "/S"),
		quests: { getAuthoredQuest: async (questId) => quests.find((quest) => quest.id === questId) },
		runnerFactory,
		prerequisiteFiller: new PrerequisiteFiller(writer, new ReferenceSolutions(paths, fileSystem, "/App/tools/solutions")),
		sandboxService: { rebuild: async (engineRoot: string, sandboxFolder: string) =>
		{
			rebuilds.push(`${engineRoot} ${sandboxFolder}`);

			return { ok: true, sandboxPath: sandboxFolder, durationMs: 1, compilerOutput: "" };
		} } as unknown as SandboxProjectService,
		snippetChecker: { check: async (engineRoot, sandboxFolder, code) => ({ ok: true, diagnostics: [{ line: 1, severity: "warning", message: `${engineRoot} ${sandboxFolder} ${code}` }] }) },
		isPassed: (questId) => (options.passed ?? []).includes(questId),
	});

	return { service, fileSystem, runs, rebuilds };
}

describe("prerequisiteQuestIds", () =>
{
	it("reads every quest id from the brief's dependency line, once each", () =>
	{
		expect(prerequisiteQuestIds(SCORE_KEEPER_BRIEF)).toEqual(["f1-training-dummy", "f1-popup-target"]);
		expect(prerequisiteQuestIds("Compiles against earlier quests: a-b (`Quests/a-b/X.h`, `Quests/a-b/Y.h`)")).toEqual(["a-b"]);
		expect(prerequisiteQuestIds("A brief that mentions `Quests/x-y/Z.h` elsewhere.")).toEqual([]);
	});
});

describe("QuestRunService.runQuest", () =>
{
	it("fills prerequisites the learner did not pass with the reference solution, says so, then runs the learner's files", async () =>
	{
		const { service, fileSystem, runs } = createService();
		const updates: ProgressUpdate[] = [];

		await service.runQuest("f1-score-keeper", { "DojoF1ScoreKeeper.h": "mine" }, (update) => updates.push(update), new AbortController().signal);

		expect(fileSystem.files.get("/S/Source/Dojo/Quests/f1-training-dummy/DojoF1TrainingDummy.cpp")).toBe("dummy cpp");
		expect(fileSystem.files.get("/S/Source/Dojo/Quests/f1-popup-target/DojoF1PopupTarget.h")).toBe("target h");
		expect(updates.map((update) => update.lastLine)).toEqual([
			"Checking earlier quests this one compiles against: f1-training-dummy, f1-popup-target",
			"Using the reference solution for f1-training-dummy (DojoF1TrainingDummy.cpp, DojoF1TrainingDummy.h) because you have not passed it yourself (tested out or not done).",
			"Using the reference solution for f1-popup-target (DojoF1PopupTarget.cpp, DojoF1PopupTarget.h) because you have not passed it yourself (tested out or not done).",
		]);
		expect(runs).toEqual([{ questId: "f1-score-keeper", files: { "DojoF1ScoreKeeper.h": "mine" }, sandboxFolder: "/S" }]);
	});

	it("keeps a passed prerequisite's own files, and refills one whose files are missing after a reset", async () =>
	{
		const { service, fileSystem } = createService({
			passed: ["f1-training-dummy", "f1-popup-target"],
			files: { "/S/Source/Dojo/Quests/f1-training-dummy/DojoF1TrainingDummy.h": "learner h", "/S/Source/Dojo/Quests/f1-training-dummy/DojoF1TrainingDummy.cpp": "learner cpp" },
		});
		const updates: ProgressUpdate[] = [];

		await service.runQuest("f1-score-keeper", {}, (update) => updates.push(update), new AbortController().signal);

		expect(fileSystem.files.get("/S/Source/Dojo/Quests/f1-training-dummy/DojoF1TrainingDummy.cpp")).toBe("learner cpp");
		expect(fileSystem.files.get("/S/Source/Dojo/Quests/f1-popup-target/DojoF1PopupTarget.cpp")).toBe("target cpp");
		expect(updates.at(-1)?.lastLine).toMatch(/f1-popup-target .* because your files for it are missing \(DojoF1PopupTarget.cpp, DojoF1PopupTarget.h\)/);
		expect(updates).toHaveLength(2);
	});

	it("runs a quest without a dependency line straight away", async () =>
	{
		const { service, runs } = createService();
		const updates: ProgressUpdate[] = [];

		await service.runQuest("f1-training-dummy", {}, (update) => updates.push(update), new AbortController().signal);

		expect(updates).toEqual([]);
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
		const filler = new PrerequisiteFiller(new QuestFileWriter(paths, fileSystem), new ReferenceSolutions(paths, fileSystem, "/App/tools/solutions"));
		await expect(filler.fill("/S", ["f1-ghost"], () => false)).rejects.toThrow(/No reference solution for the earlier quest f1-ghost/);
	});

	it("checks a snippet and rebuilds with the engine and sandbox from settings", async () =>
	{
		const { service, rebuilds } = createService();

		expect((await service.checkSnippetSyntax("int x;")).diagnostics[0]?.message).toBe("/Engines/UE /S int x;");

		await service.rebuildSandbox(() => undefined, new AbortController().signal);
		expect(rebuilds).toEqual(["/Engines/UE /S"]);
	});
});

describe("ClangSnippetSyntaxChecker", () =>
{
	/** A trimmed donor response file in UBT's format. */
	const DONOR = ["-c", "-pipe", "-Werror", "-fdiagnostics-color", "-I\".\"", "-include-pch \"/S/Intermediate/pch.gch\"", "-x objective-c++", "\"/S/Source/Dojo/Support/DojoTestActor.cpp\"", "-MD -MF\"/S/x.d\"", "-o \"/S/x.o\""].join("\n");

	it("keeps the donor's flags and swaps its source, output, and -Werror for the prelude, -fsyntax-only, and the snippet", () =>
	{
		expect(snippetResponseFile(DONOR, "/S/Intermediate/DojoSnippets/SnippetPrelude.h", "/S/Intermediate/DojoSnippets/Snippet.cpp").split("\n")).toEqual([
			"-pipe",
			"-I\".\"",
			"-include-pch \"/S/Intermediate/pch.gch\"",
			"-x objective-c++",
			"-include \"/S/Intermediate/DojoSnippets/SnippetPrelude.h\"",
			"-fsyntax-only",
			"-fno-color-diagnostics",
			"-Wno-pragma-once-outside-header",
			"-Wno-infinite-recursion",
			"\"/S/Intermediate/DojoSnippets/Snippet.cpp\"",
			"",
		]);
	});

	it("keeps the snippet's own errors and warnings in order, and drops header notes and what skipping UHT causes", () =>
	{
		const output = [
			"/S/Intermediate/DojoSnippets/Snippet.cpp:8:52: error: use of undeclared identifier 'DeltaSecs'; did you mean 'DeltaSeconds'?",
			"/S/Intermediate/DojoSnippets/Snippet.cpp:8:18: note: 'DeltaSeconds' declared here",
			"/S/Intermediate/DojoSnippets/Snippet.cpp:6:3: error: use of undeclared identifier 'Super'",
			"/Engine/Source/Runtime/Core/Public/Thing.h:4:2: error: something in a header",
			"/S/Intermediate/DojoSnippets/Snippet.cpp:2:5: warning: unused variable 'Count' [-Wunused-variable]",
		].join("\n");

		expect(parseDiagnostics(output, "/S/Intermediate/DojoSnippets/Snippet.cpp")).toEqual([
			{ line: 2, column: 5, severity: "warning", message: "unused variable 'Count' [-Wunused-variable]" },
			{ line: 8, column: 52, severity: "error", message: "use of undeclared identifier 'DeltaSecs'; did you mean 'DeltaSeconds'?" },
		]);
	});

	it("runs xcrun clang++ from Engine/Source with the response file, and blanks generated.h includes without moving lines", async () =>
	{
		const responseFile = "/S/Intermediate/DojoSnippets/Snippet.rsp";
		const fileSystem = new FakeSandboxFileSystem({ "/S/Intermediate/Build/Mac/arm64/UnrealEditor/Development/Dojo/DojoTestActor.cpp.o.rsp": DONOR });
		const commandRunner = new FakeCommandRunner({ [`xcrun clang++ @${responseFile}`]: { exitCode: 1, stderr: "/S/Intermediate/DojoSnippets/Snippet.cpp:3:1: error: expected ';'" } });
		const checker = new ClangSnippetSyntaxChecker(new MacPlatformPaths("/Users/learner"), fileSystem, commandRunner);

		const result = await checker.check("/Engines/UE", "/S", "#include \"Lantern.generated.h\"\nint a = 1;\nint b = 2\n");

		expect(result).toEqual({ ok: false, diagnostics: [{ line: 3, column: 1, severity: "error", message: "expected ';'" }] });
		expect(commandRunner.workingFolders).toEqual(["/Engines/UE/Engine/Source"]);
		expect(fileSystem.files.get("/S/Intermediate/DojoSnippets/Snippet.cpp")).toBe("\nint a = 1;\nint b = 2\n");
		expect(fileSystem.files.get("/S/Intermediate/DojoSnippets/SnippetPrelude.h")).toContain("#define UCLASS(...)");
	});

	it("blanks Super:: with spaces so columns stay put and a typo after it is still the learner's", () =>
	{
		expect(prepareSnippet("\tvoid BeginPlay() override { Super::BeginPlay(); }")).toBe("\tvoid BeginPlay() override {        BeginPlay(); }");
		expect(prepareSnippet("Super::BeginPlya();")).toBe("       BeginPlya();");
	});

	it("asks for a build first when the sandbox has no response file yet", async () =>
	{
		const checker = new ClangSnippetSyntaxChecker(new MacPlatformPaths("/Users/learner"), new FakeSandboxFileSystem(), new FakeCommandRunner({}));

		await expect(checker.check("/E", "/S", "int x;")).rejects.toMatchObject({ appError: { code: "sandbox-not-ready" } });
	});
});
