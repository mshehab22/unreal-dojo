// Checks warm verifier runs (W16): unchanged quest files keep their times, changed ones are rebuilt and retested, added and removed quests are handled, and a stale build never passes.
import { mkdir, mkdtemp, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { BuildQuest } from "@shared/types/content";

import type { QuestRecord } from "../../tools/verifier/ContentCheck";
import { EngineSandbox, type EngineTarget } from "../../tools/verifier/engine/EngineSandbox";
import { EngineVerifier, type EngineReport } from "../../tools/verifier/engine/EngineVerifier";
import { KeepUnchangedFileSystem } from "../../tools/verifier/engine/KeepUnchangedFileSystem";
import { QuestParking, type QuestLocation } from "../../tools/verifier/engine/QuestParking";
import { syncWorkspace } from "../../tools/verifier/engine/syncWorkspace";
import { MacPlatformPaths } from "../../src/main/services/unreal/MacPlatformPaths";
import { NodeSandboxFileSystem } from "../../src/main/services/unreal/NodeSandboxFileSystem";
import { QuestFileWriter } from "../../src/main/services/unreal/QuestFileWriter";

let scratch: string;

beforeEach(async () =>
{
	scratch = await mkdtemp(join(tmpdir(), "dojo-warm-test-"));
});

afterEach(async () =>
{
	await rm(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
});

/** Waits long enough for a later write to get a later modification time on every file system the suite runs on. */
async function tick(): Promise<void>
{
	await new Promise((done) => setTimeout(done, 30));
}

/** The modification time of a file, in milliseconds. */
async function modifiedAt(path: string): Promise<number>
{
	return (await stat(path)).mtimeMs;
}

describe("KeepUnchangedFileSystem", () =>
{
	it("leaves a file whose bytes match, and writes a missing, changed, or byte-order-marked one", async () =>
	{
		const fileSystem = new KeepUnchangedFileSystem(new NodeSandboxFileSystem());
		const same = join(scratch, "same.cpp");
		const changed = join(scratch, "changed.cpp");
		const marked = join(scratch, "marked.cpp");
		const missing = join(scratch, "deep", "missing.cpp");

		await writeFile(same, "int A = 1;");
		await writeFile(changed, "int B = 1;");
		await writeFile(marked, "﻿int C = 1;");

		const before = { same: await modifiedAt(same), changed: await modifiedAt(changed), marked: await modifiedAt(marked) };

		await tick();
		await fileSystem.writeTextFile(same, "int A = 1;");
		await fileSystem.writeTextFile(changed, "int B = 2;");
		await fileSystem.writeTextFile(marked, "int C = 1;");
		await fileSystem.writeTextFile(missing, "int D = 1;");

		expect(await modifiedAt(same)).toBe(before.same);
		expect(await modifiedAt(changed)).toBeGreaterThan(before.changed);
		expect(await modifiedAt(marked)).toBeGreaterThan(before.marked);
		expect(await readFile(changed, "utf8")).toBe("int B = 2;");
		expect(await readFile(marked, "utf8")).toBe("int C = 1;");
		expect(await readFile(missing, "utf8")).toBe("int D = 1;");
	});
});

describe("QuestParking", () =>
{
	/** A quest folder with one file and a test file, in the scratch folder. */
	async function questOnDisk(): Promise<QuestLocation>
	{
		const location = { questFolder: join(scratch, "Source", "Quests", "a"), testFile: join(scratch, "Source", "Tests", "a.Test.cpp") };

		await mkdir(location.questFolder, { recursive: true });
		await mkdir(join(scratch, "Source", "Tests"), { recursive: true });
		await writeFile(join(location.questFolder, "A.cpp"), "code");
		await writeFile(location.testFile, "test");

		return location;
	}

	it("moves files out and back with their times, and keeps the empty quest folder while parked", async () =>
	{
		const parking = new QuestParking(join(scratch, "parked"));
		const location = await questOnDisk();
		const before = { code: await modifiedAt(join(location.questFolder, "A.cpp")), test: await modifiedAt(location.testFile) };

		await tick();
		await parking.park("a", location);

		expect(await readdir(location.questFolder)).toEqual([]);
		expect(await parking.parkedIds()).toEqual(["a"]);

		await parking.restore("a", location);

		expect(await modifiedAt(join(location.questFolder, "A.cpp"))).toBe(before.code);
		expect(await modifiedAt(location.testFile)).toBe(before.test);
		expect(await parking.parkedIds()).toEqual([]);
	});

	it("keeps the parked copy when a parked quest is parked again with nothing in place (A1325)", async () =>
	{
		const parking = new QuestParking(join(scratch, "parked"));
		const location = await questOnDisk();
		const before = await modifiedAt(join(location.questFolder, "A.cpp"));

		await parking.park("a", location);
		await parking.park("a", location);

		expect(await parking.parkedIds()).toEqual(["a"]);
		expect(await readdir(location.questFolder)).toEqual([]);

		await parking.restore("a", location);

		expect(await readFile(join(location.questFolder, "A.cpp"), "utf8")).toBe("code");
		expect(await modifiedAt(join(location.questFolder, "A.cpp"))).toBe(before);
	});

	it("keeps a file already in place over its parked copy", async () =>
	{
		const parking = new QuestParking(join(scratch, "parked"));
		const location = await questOnDisk();

		await parking.park("a", location);
		await writeFile(join(location.questFolder, "A.cpp"), "newer");
		await parking.restore("a", location);

		expect(await readFile(join(location.questFolder, "A.cpp"), "utf8")).toBe("newer");
		expect(await readdir(join(scratch, "parked"))).toEqual([]);
	});

	it("never restores what a killed park or return left half way: those folders are removed, not taken for parked quests", async () =>
	{
		const parking = new QuestParking(join(scratch, "parked"));

		await mkdir(join(scratch, "parked", "a.parking", "Quest"), { recursive: true });
		await writeFile(join(scratch, "parked", "a.parking", "Quest", "A.cpp"), "half parked");
		await mkdir(join(scratch, "parked", "b.unparking", "Quest"), { recursive: true });
		await writeFile(join(scratch, "parked", "b.unparking", "Test.cpp"), "half returned");

		expect(await parking.parkedIds()).toEqual([]);

		await parking.removeUnfinished();

		expect(await readdir(join(scratch, "parked"))).toEqual([]);
	});
});

describe("syncWorkspace with kept paths", () =>
{
	it("keeps the paths it is told to keep, but still removes entries inside a kept folder that are not kept", async () =>
	{
		const template = join(scratch, "template");
		const workspace = join(scratch, "ws");

		await mkdir(join(template, "Source", "Dojo", "Quests"), { recursive: true });
		await writeFile(join(template, "Dojo.uproject"), "{}");
		await mkdir(join(workspace, "Source", "Dojo", "Quests", "old", "nested"), { recursive: true });
		await writeFile(join(workspace, "Source", "Dojo", "Quests", "old", "Old.cpp"), "kept");
		await writeFile(join(workspace, "Source", "Dojo", "Quests", "old", "nested", "Deep.cpp"), "stray");
		await writeFile(join(workspace, "Source", "Dojo", "Stray.cpp"), "stray");

		const kept = (path: string): boolean => path === "Source/Dojo/Quests/old" || path === "Source/Dojo/Quests/old/Old.cpp";
		const summary = await syncWorkspace(template, workspace, new Map(), new Set(), kept);

		expect(summary.removed.sort()).toEqual(["Source/Dojo/Quests/old/nested", "Source/Dojo/Stray.cpp"]);
		expect(await readdir(join(workspace, "Source", "Dojo", "Quests", "old"))).toEqual(["Old.cpp"]);
	});
});

/** A build quest with one file whose solution comes from the solutions folder; the starter's text is STARTER. */
function quest(id: string, extra: Partial<BuildQuest> = {}): BuildQuest
{
	return {
		id, title: id, order: 1, kind: "build", difficulty: 1, patterns: [], skills: [], terms: [], prerequisites: [], xp: 1, estimatedMinutes: 1, concepts: ["c"],
		scaffold: "worked", brief: "b", files: [{ name: `${id}.cpp`, starter: "STARTER" }],
		tests: `IMPLEMENT_SIMPLE_AUTOMATION_TEST(F${id.replace(/-/g, "")}, "Dojo.Test.${id}", EAutomationTestFlags::EditorContext)`,
		hints: ["a", "b", "c"], rubric: ["1", "2", "3", "4", "5"], alternative: "a",
		...extra,
	};
}

/** What one fake compile produced from one source file: its text at the time, and when. */
interface CompiledObject
{
	text: string;
	compiledAt: number;
}

/** A fake UBT and test runner that behave like the real ones where staleness matters. */
interface FakeEngine
{
	target: EngineTarget;

	/** Per build, the `Source/Dojo` paths it compiled (template files left out). */
	compiledAtBuild: string[][];

	/** Per build, the quest folder names present. */
	questFoldersAtBuild: string[][];

	/** Per build, every file under `Quests` as `<quest-id>/<file>`. */
	questFilesAtBuild: string[][];
}

/** Every file under `folder`, as `/`-separated paths relative to it. */
async function filesUnder(folder: string, prefix = ""): Promise<string[]>
{
	const files: string[] = [];

	for (const entry of await readdir(folder, { withFileTypes: true }).catch(() => []))
	{
		const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`;

		if (entry.isDirectory()) files.push(...(await filesUnder(join(folder, entry.name), path)));
		else files.push(path);
	}

	return files;
}

/**
 * Real file writing (with the verifier's KeepUnchangedFileSystem), fake Unreal. The build compiles a source file only when it
 * has no object yet or the file is newer than its object, as UBT does, and keeps objects across runs (they live in the
 * workspace). The test runner judges a quest by its compiled object, not by the file on disk, so a file that changed
 * without being rebuilt would show up as a stale pass: a test passes only when the compiled text is exactly "SOLUTION".
 * Like UBT, a change in the list of quest folders (the module's include paths, one per folder) recompiles every file, since
 * every compile's command line changes. It does not model header dependencies or generated code; the real-engine runs in
 * A1323 cover those.
 */
function fakeEngine(): FakeEngine
{
	const paths = new MacPlatformPaths("/home");
	const objects = new Map<string, CompiledObject>();
	let lastFolders: string | undefined;
	const engine: FakeEngine = { target: undefined as unknown as EngineTarget, compiledAtBuild: [], questFoldersAtBuild: [], questFilesAtBuild: [] };
	const builder = {
		build: async (request: { projectFile: string }) =>
		{
			const source = join(resolve(request.projectFile, ".."), "Source", "Dojo");
			const compiled: string[] = [];

			const folders = (await readdir(join(source, "Quests"))).sort();
			const includePathsChanged = lastFolders !== undefined && lastFolders !== folders.join();

			lastFolders = folders.join();
			engine.questFoldersAtBuild.push(folders);
			engine.questFilesAtBuild.push((await filesUnder(join(source, "Quests"))).sort());

			for (const path of await filesUnder(source))
			{
				const key = join(source, path);
				const object = objects.get(key);

				if (!includePathsChanged && object !== undefined && (await modifiedAt(key)) <= object.compiledAt) continue;

				objects.set(key, { text: await readFile(key, "utf8"), compiledAt: Date.now() });

				if (!path.includes("sample-health") && (path.startsWith("Quests/") || path.startsWith("Tests/"))) compiled.push(path);
			}

			engine.compiledAtBuild.push(compiled.sort());

			return { succeeded: true, filteredOutput: "", exitCode: 0, timedOut: false, cancelled: false, durationMs: 1 };
		},
	};
	const testRunner = {
		run: async (request: { projectFile: string; testNames: string[] }) =>
		{
			const source = join(resolve(request.projectFile, ".."), "Source", "Dojo");
			const tests = request.testNames.map((name) =>
			{
				const id = name.replace("Dojo.Test.", "");
				const passed = objects.get(join(source, "Quests", id, `${id}.cpp`))?.text === "SOLUTION";

				return { name, passed, ...(passed ? {} : { message: "Expected true" }) };
			});

			return { tests, cancelled: false, exitCode: 0, durationMs: 1 };
		},
	};

	engine.target = { root: "/engine", version: "5.8.4", tools: { paths, builder, testRunner, writer: new QuestFileWriter(paths, new KeepUnchangedFileSystem(new NodeSandboxFileSystem())) } as unknown as EngineTarget["tools"] };

	return engine;
}

describe("EngineVerifier on a warm workspace", () =>
{
	let workspaceRoot: string;
	let solutionsFolder: string;

	beforeEach(() =>
	{
		workspaceRoot = join(scratch, "w");
		solutionsFolder = join(scratch, "solutions");
	});

	/** Writes `<folder>/<id>/<id>.cpp` with the given text for each quest; the folder is the solutions folder unless given. */
	async function writeSolutions(solutions: Record<string, string>, folder = solutionsFolder): Promise<void>
	{
		for (const [id, text] of Object.entries(solutions))
		{
			await mkdir(join(folder, id), { recursive: true });
			await writeFile(join(folder, id, `${id}.cpp`), text);
		}
	}

	/** Runs the verifier over the quests with the real sandbox and the fake engine, like `--solutions <folder> --quest <id>` when those are given. */
	async function verify(engine: FakeEngine, quests: BuildQuest[], run: { solutions?: string; questId?: string } = {}): Promise<EngineReport>
	{
		const verifier = new EngineVerifier({ target: engine.target, templateFolder: resolve("resources/sandbox-template"), solutionsFolder: run.solutions ?? solutionsFolder, log: () => undefined, workspaceRoot });
		const records: QuestRecord[] = quests.map((entry) => ({ quest: entry, file: `examples/${entry.id}.md` }));

		return verifier.verify(records, run.questId === undefined ? undefined : new Set([run.questId]));
	}

	/** The project's `Source/Dojo` folder in the 5.8 workspace. */
	function sourceFolder(): string
	{
		return join(workspaceRoot, "5.8", "Source", "Dojo");
	}

	it("recompiles nothing unchanged on a second run: only the file the last starter check replaced", async () =>
	{
		const engine = fakeEngine();

		await writeSolutions({ a: "SOLUTION", b: "SOLUTION" });

		// b needs a, so b's starter check puts a's solution back and the run ends with a on its solution, b on its starter.
		const quests = [quest("a"), quest("b", { prerequisites: ["a"] })];

		expect((await verify(engine, quests)).problems).toEqual([]);
		expect(engine.compiledAtBuild[0]).toEqual(["Quests/a/a.cpp", "Quests/b/b.cpp", "Tests/a.Test.cpp", "Tests/b.Test.cpp"]);

		const firstRunBuilds = engine.compiledAtBuild.length;
		const keptTest = await modifiedAt(join(sourceFolder(), "Tests", "b.Test.cpp"));

		expect((await verify(engine, quests)).problems).toEqual([]);

		// Only b's solution differs from what was last compiled; a and both tests keep their times and are not recompiled.
		expect(engine.compiledAtBuild[firstRunBuilds]).toEqual(["Quests/b/b.cpp"]);
		expect(await modifiedAt(join(sourceFolder(), "Tests", "b.Test.cpp"))).toBe(keptTest);
	}, 30_000);

	it("recompiles a quest the last run parked on its starter, since its parked bytes are the starter's", async () =>
	{
		const engine = fakeEngine();

		await writeSolutions({ a: "SOLUTION", b: "SOLUTION" });
		await verify(engine, [quest("a"), quest("b")]);

		// Neither needs the other, so b's starter check parked a while a still held its starter.
		expect(await readFile(join(workspaceRoot, "5.8", "Saved", "VerifierParked", "a", "Quest", "a.cpp"), "utf8")).toBe("STARTER");

		const firstRunBuilds = engine.compiledAtBuild.length;

		expect((await verify(engine, [quest("a"), quest("b")])).problems).toEqual([]);
		expect(engine.compiledAtBuild[firstRunBuilds]).toEqual(["Quests/a/a.cpp", "Quests/b/b.cpp"]);
	}, 30_000);

	it("rebuilds and retests a changed solution, so a solution that now fails is reported, never a stale pass", async () =>
	{
		const engine = fakeEngine();

		await writeSolutions({ a: "SOLUTION", b: "SOLUTION" });
		await verify(engine, [quest("a"), quest("b")]);

		// a was parked when the last run ended, so this also covers a changed solution whose old copy waits in the parked folder.
		await writeSolutions({ a: "SOLUTION BUT BROKEN" });

		const firstRunBuilds = engine.compiledAtBuild.length;
		const report = await verify(engine, [quest("a"), quest("b")]);

		expect(engine.compiledAtBuild[firstRunBuilds]).toContain("Quests/a/a.cpp");
		expect(report.problems.map((problem) => `${problem.file}: ${problem.message.split("\n")[0] ?? ""}`)).toContain("examples/a.md: test Dojo.Test.a fails with the reference solution (Fail):");

		// Put back, it passes again: the fixed file is newer than the broken object.
		await writeSolutions({ a: "SOLUTION" });

		expect((await verify(engine, [quest("a"), quest("b")])).problems).toEqual([]);
	}, 30_000);

	it("rebuilds a quest whose tests changed and leaves the rest", async () =>
	{
		const engine = fakeEngine();
		const a = quest("a");
		const b = quest("b", { prerequisites: ["a"] });

		await writeSolutions({ a: "SOLUTION", b: "SOLUTION" });
		await verify(engine, [a, b]);

		const firstRunBuilds = engine.compiledAtBuild.length;

		await verify(engine, [{ ...a, tests: `${a.tests}\n// one more check` }, b]);

		expect(engine.compiledAtBuild[firstRunBuilds]).toEqual(["Quests/b/b.cpp", "Tests/a.Test.cpp"]);
		expect(await readFile(join(sourceFolder(), "Tests", "a.Test.cpp"), "utf8")).toContain("// one more check");
	}, 30_000);

	it("compiles an added quest, and takes a quest the content dropped out before the first build, parked copy included", async () =>
	{
		const engine = fakeEngine();

		await writeSolutions({ a: "SOLUTION", b: "SOLUTION", c: "SOLUTION" });
		await verify(engine, [quest("a"), quest("b")]);

		// The first run ended with a parked; dropping a must remove its parked copy too.
		expect(await readdir(join(workspaceRoot, "5.8", "Saved", "VerifierParked"))).toEqual(["a"]);

		const firstRunBuilds = engine.compiledAtBuild.length;
		const report = await verify(engine, [quest("b"), quest("c")]);

		expect(report.problems).toEqual([]);
		// The quest folders changed (a went, c came), so the module's include paths changed and every file recompiled, as in UBT.
		expect(engine.compiledAtBuild[firstRunBuilds]).toEqual(["Quests/b/b.cpp", "Quests/c/c.cpp", "Tests/b.Test.cpp", "Tests/c.Test.cpp"]);
		expect(engine.questFoldersAtBuild[firstRunBuilds]).toEqual(["b", "c", "sample-health"]);
		expect(await readdir(join(sourceFolder(), "Tests"))).not.toContain("a.Test.cpp");
		expect(await readdir(join(workspaceRoot, "5.8", "Saved", "VerifierParked")).catch(() => [])).not.toContain("a");
	}, 30_000);

	it("adds a file a kept quest gained and drops one it lost, also when the lost one waits in the parked copy", async () =>
	{
		const engine = fakeEngine();
		const withOld = quest("a", { files: [{ name: "a.cpp", starter: "STARTER" }, { name: "Old.h", starter: "// old starter" }] });
		const withNew = quest("a", { files: [{ name: "a.cpp", starter: "STARTER" }, { name: "New.h", starter: "// new starter" }] });

		await writeSolutions({ a: "SOLUTION", b: "SOLUTION" });
		await writeFile(join(solutionsFolder, "a", "Old.h"), "// old");
		await verify(engine, [withOld, quest("b")]);

		// b's starter check parked a, Old.h included.
		expect((await readdir(join(workspaceRoot, "5.8", "Saved", "VerifierParked", "a", "Quest"))).sort()).toEqual(["Old.h", "a.cpp"]);

		await rm(join(solutionsFolder, "a", "Old.h"));
		await writeFile(join(solutionsFolder, "a", "New.h"), "// new");

		const firstRunBuilds = engine.compiledAtBuild.length;
		const report = await verify(engine, [withNew, quest("b")]);

		expect(report.problems).toEqual([]);
		expect(engine.compiledAtBuild[firstRunBuilds]).toEqual(["Quests/a/New.h", "Quests/a/a.cpp", "Quests/b/b.cpp"]);
		expect(engine.questFilesAtBuild[firstRunBuilds]?.filter((path) => path.startsWith("a/"))).toEqual(["a/New.h", "a/a.cpp"]);

		// This run ended by parking a again, with its new file list.
		expect((await readdir(join(workspaceRoot, "5.8", "Saved", "VerifierParked", "a", "Quest"))).sort()).toEqual(["New.h", "a.cpp"]);
	}, 30_000);

	it("runs a mutation from a scratch folder with only some solutions as one small compile: the others are parked, not removed (A1325)", async () =>
	{
		const engine = fakeEngine();
		const quests = [quest("a"), quest("b"), quest("c")];
		const scratchCopy = join(scratch, "scratch-copy");

		// The author's baseline on the full folder, judged on c: c's starter check parks a and b on their solutions.
		await writeSolutions({ a: "SOLUTION", b: "SOLUTION", c: "SOLUTION" });
		expect((await verify(engine, quests, { questId: "c" })).problems).toEqual([]);

		// A content author's mutation: a scratch folder with only their world's solution (c), changed so its tests should fail.
		await writeSolutions({ c: "MUTANT" }, scratchCopy);

		const fullRunBuilds = engine.compiledAtBuild.length;
		const mutant = await verify(engine, quests, { solutions: scratchCopy, questId: "c" });

		expect(mutant.problems.map((problem) => problem.message.split("\n")[0])).toEqual(["test Dojo.Test.c fails with the reference solution (Fail):", "starter check inconclusive: the reference solution fails, so the starter was not checked"]);
		expect(engine.compiledAtBuild.slice(fullRunBuilds)).toEqual([["Quests/c/c.cpp"]]);
		expect(engine.questFoldersAtBuild[fullRunBuilds]).toEqual(["a", "b", "c", "sample-health"]);
		expect(engine.questFilesAtBuild[fullRunBuilds]).toEqual(["c/c.cpp", "sample-health/SampleHealthComponent.cpp", "sample-health/SampleHealthComponent.h"]);

		// The mutation undone: c passes again, from its own fresh compile, not a stale one.
		await writeSolutions({ c: "SOLUTION" }, scratchCopy);

		const restoredBuilds = engine.compiledAtBuild.length;

		expect((await verify(engine, quests, { solutions: scratchCopy, questId: "c" })).problems).toEqual([]);
		expect(engine.compiledAtBuild[restoredBuilds]).toEqual(["Quests/c/c.cpp"]);

		// Back on the full folder: a and b come back from the parked copies at their old times, so only c (left on its starter
		// by the last starter check) recompiles, and every quest is judged and passes, a and b on what they compiled in the baseline.
		const backBuilds = engine.compiledAtBuild.length;

		expect((await verify(engine, quests)).problems).toEqual([]);
		expect(engine.compiledAtBuild[backBuilds]).toEqual(["Quests/c/c.cpp"]);
		expect(engine.questFoldersAtBuild.every((folders) => folders.join() === "a,b,c,sample-health")).toBe(true);
	}, 60_000);

	it("removes a quest parked by a run on another folder once the content drops it, parked copy included (A1325)", async () =>
	{
		const engine = fakeEngine();
		const onlyB = join(scratch, "only-b");

		await writeSolutions({ a: "SOLUTION", b: "SOLUTION" });
		await verify(engine, [quest("a"), quest("b")], { questId: "a" });
		await writeSolutions({ b: "SOLUTION" }, onlyB);
		await verify(engine, [quest("a"), quest("b")], { solutions: onlyB, questId: "b" });

		expect(await readdir(join(workspaceRoot, "5.8", "Saved", "VerifierParked"))).toContain("a");

		expect((await verify(engine, [quest("b")], { solutions: onlyB })).problems).toEqual([]);
		expect((await readdir(join(sourceFolder(), "Quests"))).sort()).toEqual(["b", "sample-health"]);
		expect(await readdir(join(workspaceRoot, "5.8", "Saved", "VerifierParked")).catch(() => [])).not.toContain("a");
	}, 60_000);

	it("never passes a parked quest stale: one that changed while it waited is rebuilt when it comes back (A1325)", async () =>
	{
		const engine = fakeEngine();
		const quests = [quest("a"), quest("b")];
		const onlyB = join(scratch, "only-b");

		await writeSolutions({ a: "SOLUTION", b: "SOLUTION" });
		await verify(engine, quests);
		await writeSolutions({ b: "SOLUTION" }, onlyB);
		await verify(engine, quests, { solutions: onlyB, questId: "b" });

		// a was parked by the run above; its solution now changes in the real folder, so it must recompile and fail.
		await writeSolutions({ a: "BROKEN" });

		const builds = engine.compiledAtBuild.length;
		const report = await verify(engine, quests);

		expect(engine.compiledAtBuild[builds]).toContain("Quests/a/a.cpp");
		expect(report.problems.map((problem) => `${problem.file}: ${problem.message.split("\n")[0] ?? ""}`)).toContain("examples/a.md: test Dojo.Test.a fails with the reference solution (Fail):");
	}, 60_000);

	it("keeps every quest folder through the starter checks, so the module's include paths never change within a run", async () =>
	{
		const engine = fakeEngine();

		await writeSolutions({ a: "SOLUTION", b: "SOLUTION", c: "SOLUTION" });

		const report = await verify(engine, [quest("a"), quest("b", { prerequisites: ["a"] }), quest("c")]);

		expect(report.problems).toEqual([]);
		expect(engine.questFoldersAtBuild).toHaveLength(4);
		expect(engine.questFoldersAtBuild.every((folders) => folders.join() === "a,b,c,sample-health")).toBe(true);

		// c's starter check parked a and b: their files are out of the build, their folders are still there.
		expect(await readdir(join(sourceFolder(), "Quests", "a"))).toEqual([]);
		expect(await readdir(join(workspaceRoot, "5.8", "Saved", "VerifierParked")).then((names) => names.sort())).toEqual(["a", "b"]);
	}, 30_000);

	it("leaves the template's own quest alone and removes a stray quest folder an older run or a person left", async () =>
	{
		const engine = fakeEngine();

		await writeSolutions({ a: "SOLUTION" });
		await verify(engine, [quest("a")]);
		await mkdir(join(sourceFolder(), "Quests", "stray"), { recursive: true });
		await writeFile(join(sourceFolder(), "Quests", "stray", "Stray.cpp"), "stray");
		await writeFile(join(sourceFolder(), "Tests", "stray.Test.cpp"), "stray");

		await writeFile(join(sourceFolder(), "Tests", "only-test.Test.cpp"), "a quest with a test file and no folder");

		expect((await verify(engine, [quest("a")])).problems).toEqual([]);
		expect((await readdir(join(sourceFolder(), "Quests"))).sort()).toEqual(["a", "sample-health"]);
		expect((await readdir(join(sourceFolder(), "Tests"))).sort()).toEqual(["a.Test.cpp", "sample-health.Test.cpp"]);
	}, 30_000);

	it("recovers from a run killed half way through parking a quest: the half-parked file is written fresh and passes", async () =>
	{
		const engine = fakeEngine();
		const quests = [quest("a"), quest("b", { prerequisites: ["a"] })];

		await writeSolutions({ a: "SOLUTION", b: "SOLUTION" });
		await verify(engine, quests);

		// As if a park of a had moved its code but was killed before its test file and the final rename.
		const staging = join(workspaceRoot, "5.8", "Saved", "VerifierParked", "a.parking", "Quest");

		await mkdir(staging, { recursive: true });
		await rename(join(sourceFolder(), "Quests", "a", "a.cpp"), join(staging, "a.cpp"));

		const firstRunBuilds = engine.compiledAtBuild.length;

		expect((await verify(engine, quests)).problems).toEqual([]);
		expect(engine.compiledAtBuild[firstRunBuilds]).toEqual(["Quests/a/a.cpp", "Quests/b/b.cpp"]);
		expect(await readdir(join(workspaceRoot, "5.8", "Saved", "VerifierParked")).catch(() => [])).not.toContain("a.parking");
	}, 30_000);

	it("refuses to park, write or remove the template's own quest", async () =>
	{
		const engine = fakeEngine();
		const sandbox = await EngineSandbox.create(resolve("resources/sandbox-template"), engine.target, { workspaceRoot });

		try
		{
			await expect(sandbox.parkQuest("sample-health")).rejects.toThrow("template's own quest");
			await expect(sandbox.removeQuest("sample-health")).rejects.toThrow("template's own quest");
			await expect(sandbox.writeQuest({ id: "sample-health", title: "x", tests: "" }, [])).rejects.toThrow("template's own quest");
			expect(await sandbox.questsInPlace()).toEqual([]);
		}
		finally
		{
			await sandbox.release();
		}
	}, 30_000);
});
