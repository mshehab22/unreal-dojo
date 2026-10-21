// Checks the --engine stage without Unreal: sandbox setup through M1.3's file writer, and the verifier's decisions with a fake sandbox.
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { BossQuest, BuildQuest } from "@shared/types/content";

import { AutomationTestRunner } from "../../src/main/services/unreal/AutomationTestRunner";
import { MacPlatformPaths } from "../../src/main/services/unreal/MacPlatformPaths";
import { NodeProcessLauncher } from "../../src/main/services/unreal/NodeProcessLauncher";
import { NodeSandboxFileSystem } from "../../src/main/services/unreal/NodeSandboxFileSystem";
import { PosixProcessTreeKiller } from "../../src/main/services/unreal/PosixProcessTreeKiller";
import { QuestFileWriter } from "../../src/main/services/unreal/QuestFileWriter";
import { SYSTEM_TIMER } from "../../src/main/services/unreal/SupervisedProcess";
import { UnrealBuilder } from "../../src/main/services/unreal/UnrealBuilder";
import type { QuestRecord } from "../../tools/verifier/ContentCheck";
import { EngineSandbox, type EngineTarget, type SandboxBuild, type SandboxFile, type SandboxTestRun } from "../../tools/verifier/engine/EngineSandbox";
import { EngineVerifier, type VerifierSandbox } from "../../tools/verifier/engine/EngineVerifier";

let scratch: string;

beforeEach(async () =>
{
	scratch = await mkdtemp(join(tmpdir(), "dojo-engine-test-"));
});

afterEach(async () =>
{
	await rm(scratch, { recursive: true, force: true });
});

/** A build that succeeded, or failed with the given output lines. */
function buildResult(lines?: string[]): SandboxBuild
{
	return lines === undefined ? { succeeded: true, lines: [] } : { succeeded: false, lines };
}

/** A real engine target on the Mac paths, with M1.3's tools, for sandbox tests that never start Unreal. */
function macTarget(version: string): EngineTarget
{
	const paths = new MacPlatformPaths("/home");
	const fileSystem = new NodeSandboxFileSystem();
	const launcher = new NodeProcessLauncher(new PosixProcessTreeKiller((processId, signal) => process.kill(processId, signal)));

	return {
		root: "/engine",
		version,
		tools: { paths, builder: new UnrealBuilder(paths, launcher, SYSTEM_TIMER), testRunner: new AutomationTestRunner(paths, launcher, SYSTEM_TIMER, fileSystem), writer: new QuestFileWriter(paths, fileSystem) },
	};
}

/** A build quest with one file and one test, whose starter and solution are told apart by their text. */
function quest(id: string): BuildQuest
{
	return {
		id, title: id, order: 1, kind: "build", difficulty: 1, patterns: [], skills: [], terms: [], prerequisites: [], xp: 1, estimatedMinutes: 1, concepts: ["c"],
		scaffold: "worked", brief: "b", files: [{ name: `${id}.cpp`, starter: "STARTER" }],
		tests: `IMPLEMENT_SIMPLE_AUTOMATION_TEST(F${id.replace(/-/g, "")}, "Dojo.Test.${id}", EAutomationTestFlags::EditorContext)`,
		hints: ["a", "b", "c"], rubric: ["1", "2", "3", "4", "5"], alternative: "a",
	};
}

/**
 * A sandbox that never runs Unreal. A build fails when any written file contains BROKEN; a test passes when its
 * quest's current files are the solution, or when the quest is listed in `starterPasses`.
 */
class FakeSandbox implements VerifierSandbox
{
	readonly folder = "/fake/sandbox";
	readonly written = new Map<string, SandboxFile[]>();
	removed = false;
	starterPasses = new Set<string>();

	/** Starter quest id to the quest whose files the build error points at while that starter is in place. */
	starterBreaks = new Map<string, string>();

	/** Quests whose tests are missing from the report while their starter is in place. */
	starterTestsMissing = new Set<string>();

	/** Every write, removal, and build in order, for checking the sequence. */
	readonly operations: string[] = [];

	/** Records the files; the fake does not inspect tests. */
	async writeQuest(quest: { id: string }, files: readonly SandboxFile[]): Promise<void>
	{
		this.written.set(quest.id, [...files]);
		this.operations.push(`write ${quest.id}: ${files.map((file) => `${file.name}=${file.text}`).join(", ")}`);
	}

	/** Forgets a quest's files. */
	async removeQuest(questId: string): Promise<void>
	{
		this.written.delete(questId);
		this.operations.push(`remove ${questId}`);
	}

	/** Fails when a written file says BROKEN, quoting a compiler-style line for that quest. */
	async build(): Promise<SandboxBuild>
	{
		this.operations.push("build");

		const broken = [...this.written].find(([, files]) => files.some((file) => file.text.includes("BROKEN")));
		const breaker = [...this.starterBreaks.keys()].find((id) => this.holdsStarter(id));
		const blamed = broken?.[0] ?? (breaker === undefined ? undefined : this.starterBreaks.get(breaker));

		return blamed === undefined ? buildResult() : buildResult([`/x/Source/Dojo/Quests/${blamed}/a.cpp:3:1: error: expected ';'`, "Result: Failed (OtherCompilationError)"]);
	}

	/** Passes each test whose quest holds its solution (or a starter listed in `starterPasses`). */
	async runTests(testNames: readonly string[]): Promise<SandboxTestRun>
	{
		const outcomes = new Map<string, { passed: boolean; state: string; messages: string[] }>();

		for (const name of testNames)
		{
			const questId = name.replace("Dojo.Test.", "");
			const isStarter = this.holdsStarter(questId);

			if (isStarter && this.starterTestsMissing.has(questId)) continue;

			const passed = !isStarter || this.starterPasses.has(questId);

			outcomes.set(name, { passed, state: passed ? "Success" : "Fail", messages: passed ? [] : ["Error: Expected true"] });
		}

		return { outcomes };
	}

	/** Whether a quest's folder currently holds its starter. */
	holdsStarter(questId: string): boolean
	{
		return this.written.get(questId)?.some((file) => file.text === "STARTER") ?? false;
	}

	/** Marks the sandbox removed. */
	async remove(): Promise<void>
	{
		this.removed = true;
	}
}

/** Writes `tools/solutions/<id>/<id>.cpp` with the given text for each quest. */
async function writeSolutions(solutions: Record<string, string>): Promise<string>
{
	const folder = join(scratch, "solutions");

	for (const [id, text] of Object.entries(solutions))
	{
		await mkdir(join(folder, id), { recursive: true });
		await writeFile(join(folder, id, `${id}.cpp`), text);
	}

	return folder;
}

/** A boss quest with the given id; its code and tests come only from its solution folder (A67). */
function boss(id: string): BossQuest
{
	return {
		id, title: id, order: 1, kind: "boss", difficulty: 4, patterns: [], skills: [], terms: [], prerequisites: [], xp: 1, estimatedMinutes: 1, concepts: ["c"],
		spec: "s", requiredPieces: [], referencePlans: [], pieces: [], integrationRubric: [],
	};
}

/** Writes a boss integration folder: one code file and, optionally, one test file declaring `Dojo.Test.<id>`. */
async function writeBossSolution(id: string, withTests: boolean): Promise<string>
{
	const folder = join(scratch, "solutions");

	await mkdir(join(folder, id), { recursive: true });
	await writeFile(join(folder, id, "DojoBoss.cpp"), "SOLUTION");

	if (withTests) await writeFile(join(folder, id, "DojoBoss.Test.cpp"), `IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBoss, "Dojo.Test.${id}", EAutomationTestFlags::EditorContext)`);

	return folder;
}

/** Runs the verifier over the quests with a fake sandbox. */
async function verifyWith(sandbox: FakeSandbox, quests: (BuildQuest | BossQuest)[], solutionsFolder: string, scope?: Set<string>): Promise<Awaited<ReturnType<EngineVerifier["verify"]>>>
{
	const verifier = new EngineVerifier({
		target: macTarget("5.8.3"),
		templateFolder: "/template",
		solutionsFolder,
		log: () => undefined,
		createSandbox: async () => sandbox,
	});
	const records: QuestRecord[] = quests.map((entry) => ({ quest: entry, file: `examples/${entry.id}.md` }));

	return verifier.verify(records, scope);
}

describe("EngineSandbox", () =>
{
	it("copies the template to a real (not linked) temp path and writes the engine association", async () =>
	{
		const sandbox = await EngineSandbox.create(resolve("resources/sandbox-template"), macTarget("5.8.3"));
		const project = JSON.parse(await readFile(join(sandbox.folder, "Dojo.uproject"), "utf8")) as { EngineAssociation: string; Plugins: unknown[] };

		await sandbox.writeQuest({ id: "q1", title: "Q1", tests: "// tests" }, [{ name: "A.cpp", text: "int A = 1;" }]);

		expect(sandbox.folder.startsWith("/var/")).toBe(false);
		expect(project.EngineAssociation).toBe("5.8");
		expect(project.Plugins).toHaveLength(3);
		expect(await readFile(join(sandbox.folder, "Source", "Dojo", "Quests", "q1", "A.cpp"), "utf8")).toBe("int A = 1;");
		expect(await readFile(join(sandbox.folder, "Source", "Dojo", "Tests", "q1.Test.cpp"), "utf8")).toContain("// tests");

		await sandbox.remove();
	});

	it("drops the 5.8-only plugins for an older engine", async () =>
	{
		const sandbox = await EngineSandbox.create(resolve("resources/sandbox-template"), macTarget("5.6.1"));
		const project = JSON.parse(await readFile(join(sandbox.folder, "Dojo.uproject"), "utf8")) as { Plugins: unknown[] };

		expect(project.Plugins).toEqual([]);

		await sandbox.remove();
	});
});

describe("EngineVerifier", () =>
{
	it("passes solutions that pass and starters that fail, and removes the sandbox", async () =>
	{
		const sandbox = new FakeSandbox();
		const report = await verifyWith(sandbox, [quest("a"), quest("b")], await writeSolutions({ a: "SOLUTION", b: "SOLUTION" }));

		expect(report.problems).toEqual([]);
		expect(report.questsChecked).toBe(2);
		expect(sandbox.removed).toBe(true);
		expect(sandbox.written.get("a")?.[0]?.text).toBe("SOLUTION");
	});

	it("reports a starter that already passes, and keeps the sandbox", async () =>
	{
		const sandbox = new FakeSandbox();

		sandbox.starterPasses.add("b");

		const report = await verifyWith(sandbox, [quest("a"), quest("b")], await writeSolutions({ a: "SOLUTION", b: "SOLUTION" }));

		expect(report.problems.map((problem) => `${problem.file}: ${problem.message}`)).toEqual(["examples/b.md: the starter already passes its tests; the learner would have nothing to do"]);
		expect(report.keptSandbox).toBe("/fake/sandbox");
	});

	it("quotes the build errors that point into each quest when a solution does not build", async () =>
	{
		const sandbox = new FakeSandbox();
		const report = await verifyWith(sandbox, [quest("a")], await writeSolutions({ a: "BROKEN" }));

		expect(report.problems[0]?.message).toBe("the reference solution did not build:\n/x/Source/Dojo/Quests/a/a.cpp:3:1: error: expected ';'");
	});

	it("reports a test that fails with the reference solution, and judges only quests in scope", async () =>
	{
		const sandbox = new FakeSandbox();
		const failing = { ...quest("a"), files: [{ name: "a.cpp", starter: "STARTER" }] };
		const solutions = await writeSolutions({ a: "STARTER", b: "SOLUTION" });
		const report = await verifyWith(sandbox, [failing, quest("b")], solutions, new Set(["a"]));

		expect(report.questsChecked).toBe(1);
		expect(report.problems.map((problem) => problem.message)).toEqual([
			"test Dojo.Test.a fails with the reference solution (Fail):\nError: Expected true",
			"starter check inconclusive: the reference solution fails, so the starter was not checked",
		]);
		expect(sandbox.written.has("b")).toBe(true);
	});

	it("treats a starter build failure in another quest's files as inconclusive, and one in its own files as fine", async () =>
	{
		const sandbox = new FakeSandbox();

		sandbox.starterBreaks.set("a", "b");
		sandbox.starterBreaks.set("b", "b");

		const report = await verifyWith(sandbox, [quest("a"), quest("b")], await writeSolutions({ a: "SOLUTION", b: "SOLUTION" }));

		expect(report.problems.map((problem) => `${problem.severity ?? "error"} ${problem.file}: ${problem.message}`)).toEqual([
			"warning examples/a.md: starter check inconclusive: the starter broke other quests' code (no build error points into its own files)",
		]);
	});

	it("warns when a starter builds but its tests do not run", async () =>
	{
		const sandbox = new FakeSandbox();

		sandbox.starterTestsMissing.add("a");

		const report = await verifyWith(sandbox, [quest("a")], await writeSolutions({ a: "SOLUTION" }));

		expect(report.problems.map((problem) => [problem.severity, problem.message])).toEqual([["warning", "starter check inconclusive: the starter built but its tests did not all run"]]);
	});

	it("builds a boss's reference integration and runs its tests, with no starter check (A67)", async () =>
	{
		const sandbox = new FakeSandbox();
		const report = await verifyWith(sandbox, [boss("yard")], await writeBossSolution("yard", true));

		expect(report.problems).toEqual([]);
		expect(report.questsChecked).toBe(1);
		expect(sandbox.operations).toEqual(["write yard: DojoBoss.cpp=SOLUTION", "build", "remove yard"]);
		expect(report.timings.starterChecksSeconds).toBeLessThan(1);
	});

	it("reports a boss integration that declares no tests", async () =>
	{
		const report = await verifyWith(new FakeSandbox(), [boss("yard")], await writeBossSolution("yard", false));

		expect(report.problems.map((problem) => problem.message)).toEqual(["no IMPLEMENT_SIMPLE_AUTOMATION_TEST found, so the engine has nothing to run"]);
	});

	it("writes a boss's piece overrides over the piece solution, then removes the boss and restores the piece before starter checks", async () =>
	{
		const sandbox = new FakeSandbox();
		const solutions = await writeSolutions({ a: "SOLUTION" });

		await writeBossSolution("yard", true);
		await mkdir(join(solutions, "yard", "a"), { recursive: true });
		await writeFile(join(solutions, "yard", "a", "a.cpp"), "EXTENDED");

		const report = await verifyWith(sandbox, [quest("a"), { ...boss("yard"), pieces: ["a"] }], solutions);

		expect(report.problems).toEqual([]);
		expect(sandbox.operations).toEqual([
			"write a: a.cpp=SOLUTION",
			"write yard: DojoBoss.cpp=SOLUTION",
			"write a: a.cpp=EXTENDED",
			"build",
			"write a: a.cpp=SOLUTION",
			"remove yard",
			"write a: a.cpp=STARTER",
			"build",
			"write a: a.cpp=SOLUTION",
		]);
	});
});

