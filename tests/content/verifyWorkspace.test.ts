// Checks the verifier's persistent workspace (W14): where it lives, the lock, the template sync, and that no run leaves anything in Temp.
import { mkdir, mkdtemp, readdir, readFile, rm, stat, utimes, writeFile } from "node:fs/promises";
import { hostname, tmpdir, uptime } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { BuildQuest } from "@shared/types/content";

import type { QuestRecord } from "../../tools/verifier/ContentCheck";
import { parseVerifierArguments } from "../../tools/verifier/parseVerifierArguments";
import { EngineSandbox, type EngineTarget } from "../../tools/verifier/engine/EngineSandbox";
import { EngineVerifier } from "../../tools/verifier/engine/EngineVerifier";
import { pruneRunLogs } from "../../tools/verifier/engine/pruneRunLogs";
import { syncWorkspace } from "../../tools/verifier/engine/syncWorkspace";
import { WorkspaceLock } from "../../tools/verifier/engine/WorkspaceLock";
import { resolveWorkspaceRoot } from "../../tools/verifier/engine/workspaceLocation";
import { QuestFileWriter } from "../../src/main/services/unreal/QuestFileWriter";
import { MacPlatformPaths } from "../../src/main/services/unreal/MacPlatformPaths";
import { NodeSandboxFileSystem } from "../../src/main/services/unreal/NodeSandboxFileSystem";

let scratch: string;

/** Verifier work a test started; a test that fails or times out leaves it running, and it must end before the scratch folder goes. */
const inFlight: Promise<unknown>[] = [];

/** Remembers `work` so `afterEach` waits for it, and returns it unchanged. */
function track<T>(work: Promise<T>): Promise<T>
{
	inFlight.push(work);

	return work;
}

beforeEach(async () =>
{
	scratch = await mkdtemp(join(tmpdir(), "dojo-workspace-test-"));
});

afterEach(async () =>
{
	await Promise.allSettled(inFlight.splice(0));
	await rm(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });

	// A suite that leaves a dojo-* folder in Temp is the bug W14 fixes, so this fails the test instead of leaking quietly.
	await expect(stat(scratch)).rejects.toThrow();
});

/** The entries of a folder, sorted. */
async function entriesOf(folder: string): Promise<string[]>
{
	return (await readdir(folder)).sort();
}

describe("resolveWorkspaceRoot", () =>
{
	const home = "/home/dojo";

	it("keeps the Windows default short and outside Temp", () =>
	{
		const root = resolveWorkspaceRoot({ platform: "win32", homeFolder: "C:\\Users\\Dojo", environment: { LOCALAPPDATA: "C:\\Users\\Dojo\\AppData\\Local" } });

		expect(root).toBe("C:\\Users\\Dojo\\AppData\\Local\\UnrealDojo\\verify-workspace");
		expect(root.toLowerCase()).not.toContain("temp");
	});

	it("falls back to AppData\\Local without LOCALAPPDATA, and uses Library/Caches on macOS", () =>
	{
		expect(resolveWorkspaceRoot({ platform: "win32", homeFolder: "C:\\Users\\Dojo", environment: {} })).toBe("C:\\Users\\Dojo\\AppData\\Local\\UnrealDojo\\verify-workspace");
		expect(resolveWorkspaceRoot({ platform: "darwin", homeFolder: home, environment: {} })).toBe("/home/dojo/Library/Caches/UnrealDojo/verify-workspace");
	});

	it("lets the flag win over the environment variable, and the variable over the default", () =>
	{
		expect(resolveWorkspaceRoot({ platform: "darwin", homeFolder: home, environment: { DOJO_VERIFY_WORKSPACE: "/env" }, flag: "/flag" })).toBe("/flag");
		expect(resolveWorkspaceRoot({ platform: "darwin", homeFolder: home, environment: { DOJO_VERIFY_WORKSPACE: "/env" } })).toBe("/env");
		expect(resolveWorkspaceRoot({ platform: "darwin", homeFolder: home, environment: { DOJO_VERIFY_WORKSPACE: "  " } })).toBe("/home/dojo/Library/Caches/UnrealDojo/verify-workspace");
	});
});

describe("--workspace", () =>
{
	it("is read as the workspace root and needs a value", () =>
	{
		const parsed = parseVerifierArguments(["--engine", "/e", "--workspace", "/w"], "/content", "/solutions");

		expect(parsed).toMatchObject({ ok: true, options: { workspaceFolder: "/w", enginePath: "/e" } });
		expect(parseVerifierArguments(["--workspace"], "/content", "/solutions")).toEqual({ ok: false, message: "--workspace needs a value" });
	});
});

describe("WorkspaceLock", () =>
{
	const fast = { pollMilliseconds: 10, reminderMilliseconds: 20 };

	it("makes a second run wait, with a log line, until the first releases", async () =>
	{
		const folder = join(scratch, "ws.lock");
		const lines: string[] = [];
		const first = await new WorkspaceLock({ folder, log: () => undefined, ...fast }).acquire();
		let acquired = false;
		const second = new WorkspaceLock({ folder, log: (line) => lines.push(line), ...fast }).acquire().then((held) =>
		{
			acquired = true;

			return held;
		});

		await new Promise((resolveWait) => setTimeout(resolveWait, 100));

		expect(acquired).toBe(false);
		expect(lines.some((line) => line.includes("waiting for the verify workspace"))).toBe(true);

		await first.release();

		const held = await second;

		expect(acquired).toBe(true);

		await held.release();

		expect(await readdir(scratch)).toEqual([]);
	});

	it("stops waiting when the run is cancelled", async () =>
	{
		const folder = join(scratch, "ws.lock");
		const first = await new WorkspaceLock({ folder, log: () => undefined, ...fast }).acquire();
		const controller = new AbortController();
		const waiting = new WorkspaceLock({ folder, log: () => undefined, signal: controller.signal, ...fast }).acquire();

		setTimeout(() => controller.abort(), 50);

		await expect(waiting).rejects.toThrow("cancelled while waiting");
		await first.release();
	});

	it("breaks a lock whose process is gone, and says so", async () =>
	{
		const folder = join(scratch, "ws.lock");
		const lines: string[] = [];

		await mkdir(folder);
		await writeFile(join(folder, "owner.json"), JSON.stringify({ token: "dead", processId: 424242, hostName: hostname(), startedAt: new Date().toISOString(), workingFolder: "/elsewhere" }));

		const held = await new WorkspaceLock({ folder, log: (line) => lines.push(line), isProcessAlive: () => false, ...fast }).acquire();

		expect(lines.join("\n")).toContain("process 424242 that held it is no longer running");

		await held.release();
	});

	it("keeps waiting for a live holder, and breaks a lock older than any run even when its process exists", async () =>
	{
		const folder = join(scratch, "ws.lock");

		await mkdir(folder);
		await writeFile(join(folder, "owner.json"), JSON.stringify({ token: "alive", processId: process.pid, hostName: hostname(), startedAt: new Date().toISOString(), workingFolder: "/elsewhere" }));

		const controller = new AbortController();

		setTimeout(() => controller.abort(), 80);

		await expect(new WorkspaceLock({ folder, log: () => undefined, signal: controller.signal, ...fast }).acquire()).rejects.toThrow("cancelled while waiting");
		expect(await readdir(scratch)).toEqual(["ws.lock"]);

		const held = await new WorkspaceLock({ folder, log: () => undefined, staleAfterMilliseconds: -1, ...fast }).acquire();

		await held.release();
	});

	it("breaks a lock folder that never got an owner file once the grace is over, not before", async () =>
	{
		const folder = join(scratch, "ws.lock");

		await mkdir(folder);

		const controller = new AbortController();

		setTimeout(() => controller.abort(), 60);

		await expect(new WorkspaceLock({ folder, log: () => undefined, signal: controller.signal, ownerGraceMilliseconds: 60_000, ...fast }).acquire()).rejects.toThrow("cancelled");

		const longAgo = new Date(Date.now() - 120_000);

		await utimes(folder, longAgo, longAgo);

		const held = await new WorkspaceLock({ folder, log: () => undefined, ...fast }).acquire();

		await held.release();
	});

	it("never lets two runs hold the lock at once, however many wait", async () =>
	{
		const folder = join(scratch, "ws.lock");
		let holders = 0;
		let mostAtOnce = 0;

		/** Takes the lock, holds it for a moment, and records how many runs held it together. */
		async function run(): Promise<void>
		{
			const held = await new WorkspaceLock({ folder, log: () => undefined, ...fast }).acquire();

			holders++;
			mostAtOnce = Math.max(mostAtOnce, holders);
			await new Promise((resolveWait) => setTimeout(resolveWait, 15));
			holders--;
			await held.release();
		}

		await Promise.all(Array.from({ length: 6 }, run));

		expect(mostAtOnce).toBe(1);
		expect(await readdir(scratch)).toEqual([]);
	}, 30_000);

	it("breaks a lock made before the machine last started, even when a program now has its process id", async () =>
	{
		const folder = join(scratch, "ws.lock");
		const lines: string[] = [];
		const beforeBoot = new Date(Date.now() - uptime() * 1000 - 5 * 60_000).toISOString();

		await mkdir(folder);
		await writeFile(join(folder, "owner.json"), JSON.stringify({ token: "old", processId: process.pid, hostName: hostname(), startedAt: beforeBoot, workingFolder: "/elsewhere" }));

		const held = await new WorkspaceLock({ folder, log: (line) => lines.push(line), staleAfterMilliseconds: 1e12, ...fast }).acquire();

		expect(lines.join("\n")).toContain("made before the last restart");

		await held.release();
	});

	it("does not remove a lock somebody else took after this run's was broken", async () =>
	{
		const folder = join(scratch, "ws.lock");
		const mine = await new WorkspaceLock({ folder, log: () => undefined, ...fast }).acquire();

		await rm(folder, { recursive: true });

		const theirs = await new WorkspaceLock({ folder, log: () => undefined, ...fast }).acquire();

		await mine.release();

		expect(await readdir(scratch)).toEqual(["ws.lock"]);

		await theirs.release();
	});
});

describe("syncWorkspace", () =>
{
	const skipped = new Set(["Binaries", "Intermediate", "Saved", "DerivedDataCache"]);

	/** A small template with a project file, a build file, and the template's own quest. */
	async function makeTemplate(): Promise<string>
	{
		const template = join(scratch, "template");

		await mkdir(join(template, "Source", "Dojo", "Quests", "sample"), { recursive: true });
		await mkdir(join(template, "Source", "Dojo", "Tests"), { recursive: true });
		await writeFile(join(template, "Dojo.uproject"), "{}");
		await writeFile(join(template, "Source", "Dojo", "Dojo.Build.cs"), "build v1");
		await writeFile(join(template, "Source", "Dojo", "Quests", "sample", "Sample.cpp"), "sample");

		return template;
	}

	it("leaves files that already match untouched, so their timestamps do not trigger a rebuild", async () =>
	{
		const template = await makeTemplate();
		const workspace = join(scratch, "ws");

		await syncWorkspace(template, workspace, new Map(), skipped);

		const before = (await stat(join(workspace, "Source", "Dojo", "Dojo.Build.cs"))).mtimeMs;

		await new Promise((resolveWait) => setTimeout(resolveWait, 30));

		const second = await syncWorkspace(template, workspace, new Map(), skipped);

		expect(second).toEqual({ written: [], removed: [] });
		expect((await stat(join(workspace, "Source", "Dojo", "Dojo.Build.cs"))).mtimeMs).toBe(before);
	});

	it("picks up a changed, added and removed template file", async () =>
	{
		const template = await makeTemplate();
		const workspace = join(scratch, "ws");

		await syncWorkspace(template, workspace, new Map(), skipped);
		await writeFile(join(template, "Source", "Dojo", "Dojo.Build.cs"), "build v2");
		await writeFile(join(template, "Source", "Dojo", "New.cpp"), "new");
		await rm(join(template, "Source", "Dojo", "Quests"), { recursive: true });

		const summary = await syncWorkspace(template, workspace, new Map(), skipped);

		expect(summary.written.sort()).toEqual(["Source/Dojo/Dojo.Build.cs", "Source/Dojo/New.cpp"]);
		expect(summary.removed).toEqual(["Source/Dojo/Quests"]);
		expect(await readFile(join(workspace, "Source", "Dojo", "Dojo.Build.cs"), "utf8")).toBe("build v2");
		expect(await entriesOf(join(workspace, "Source", "Dojo"))).toEqual(["Dojo.Build.cs", "New.cpp", "Tests"]);
	});

	it("removes quest folders and test files the template does not have, but never build outputs", async () =>
	{
		const template = await makeTemplate();
		const workspace = join(scratch, "ws");

		await syncWorkspace(template, workspace, new Map(), skipped);
		await mkdir(join(workspace, "Source", "Dojo", "Quests", "old-quest"), { recursive: true });
		await writeFile(join(workspace, "Source", "Dojo", "Quests", "old-quest", "Old.cpp"), "stale");
		await writeFile(join(workspace, "Source", "Dojo", "Tests", "old-quest.Test.cpp"), "stale");
		await mkdir(join(workspace, "Binaries"), { recursive: true });
		await mkdir(join(workspace, "Saved", "VerifierLogs"), { recursive: true });
		await writeFile(join(workspace, "Binaries", "Dojo.dll"), "built");

		const summary = await syncWorkspace(template, workspace, new Map(), skipped);

		expect(summary.removed.sort()).toEqual(["Source/Dojo/Quests/old-quest", "Source/Dojo/Tests/old-quest.Test.cpp"]);
		expect(await entriesOf(join(workspace, "Source", "Dojo", "Quests"))).toEqual(["sample"]);
		expect(await readFile(join(workspace, "Binaries", "Dojo.dll"), "utf8")).toBe("built");
		expect(await entriesOf(join(workspace, "Saved"))).toEqual(["VerifierLogs"]);
	});

	it("writes the text it is given for a file instead of the template's copy", async () =>
	{
		const template = await makeTemplate();
		const workspace = join(scratch, "ws");

		await syncWorkspace(template, workspace, new Map([["Dojo.uproject", "{\"EngineAssociation\":\"5.8\"}"]]), skipped);

		expect(await readFile(join(workspace, "Dojo.uproject"), "utf8")).toBe("{\"EngineAssociation\":\"5.8\"}");
	});
});

describe("pruneRunLogs", () =>
{
	it("keeps the newest run folders and leaves files alone", async () =>
	{
		for (const name of ["20261001T000000000Z", "20261002T000000000Z", "20261003T000000000Z"]) await mkdir(join(scratch, name));

		await writeFile(join(scratch, "note.txt"), "x");

		expect(await pruneRunLogs(scratch, 2)).toEqual(["20261001T000000000Z"]);
		expect(await entriesOf(scratch)).toEqual(["20261002T000000000Z", "20261003T000000000Z", "note.txt"]);
	});
});

/** A build quest with one file and one test; the starter and the solution are told apart by the file's text. */
function quest(id: string): BuildQuest
{
	return {
		id, title: id, order: 1, kind: "build", difficulty: 1, patterns: [], skills: [], terms: [], prerequisites: [], xp: 1, estimatedMinutes: 1, concepts: ["c"],
		scaffold: "worked", brief: "b", files: [{ name: `${id}.cpp`, starter: "STARTER" }],
		tests: `IMPLEMENT_SIMPLE_AUTOMATION_TEST(F${id.replace(/-/g, "")}, "Dojo.Test.${id}", EAutomationTestFlags::EditorContext)`,
		hints: ["a", "b", "c"], rubric: ["1", "2", "3", "4", "5"], alternative: "a",
	};
}

/** What the fake build and test tools saw and should do. */
interface FakeTooling
{
	target: EngineTarget;

	/** The quest folder names in the project at each build. */
	questFoldersAtBuild: string[][];

	/** Every project folder a build was started in. */
	projectFolders: string[];
	behaviour: { throwOnBuild?: number; abortOnBuild?: AbortController; failTests?: boolean };
}

/** Real file writing, fake Unreal: a build records the project's quest folders and leaves a marker in Binaries; tests fail on request or while the starter is in place. */
function fakeTooling(): FakeTooling
{
	const paths = new MacPlatformPaths("/home");
	const fileSystem = new NodeSandboxFileSystem();
	let builds = 0;
	const tooling: FakeTooling = { target: undefined as unknown as EngineTarget, questFoldersAtBuild: [], projectFolders: [], behaviour: {} };
	const builder = {
		build: async (request: { projectFile: string }) =>
		{
			const folder = resolve(request.projectFile, "..");

			builds++;
			tooling.projectFolders.push(folder);
			tooling.questFoldersAtBuild.push((await readdir(join(folder, "Source", "Dojo", "Quests"))).sort());

			if (tooling.behaviour.throwOnBuild === builds) throw new Error("the build tool crashed");

			tooling.behaviour.abortOnBuild?.abort();
			await mkdir(join(folder, "Binaries"), { recursive: true });
			await writeFile(join(folder, "Binaries", "built.marker"), String(builds));

			return { succeeded: true, filteredOutput: "", exitCode: 0, timedOut: false, cancelled: false, durationMs: 1 };
		},
	};
	const testRunner = {
		run: async (request: { projectFile: string; testNames: string[] }) =>
		{
			const folder = resolve(request.projectFile, "..");
			const tests = [];

			for (const name of request.testNames)
			{
				const id = name.replace("Dojo.Test.", "");
				const text = await readFile(join(folder, "Source", "Dojo", "Quests", id, `${id}.cpp`), "utf8").catch(() => "");
				const passed = tooling.behaviour.failTests === true ? false : text !== "STARTER";

				tests.push({ name, passed, ...(passed ? {} : { message: "Expected true" }) });
			}

			return { tests, cancelled: false, exitCode: 0, durationMs: 1 };
		},
	};

	tooling.target = { root: "/engine", version: "5.8.3", tools: { paths, builder, testRunner, writer: new QuestFileWriter(paths, fileSystem) } as unknown as EngineTarget["tools"] };

	return tooling;
}

describe("EngineVerifier with the real persistent workspace", () =>
{
	let tempRoot: string;
	let workspaceRoot: string;
	let solutionsFolder: string;
	const savedEnvironment = { TEMP: process.env["TEMP"], TMP: process.env["TMP"], TMPDIR: process.env["TMPDIR"] };

	beforeEach(async () =>
	{
		tempRoot = join(scratch, "temp");
		workspaceRoot = join(scratch, "cache", "verify-workspace");
		solutionsFolder = join(scratch, "solutions");

		await mkdir(tempRoot, { recursive: true });

		// The system temp folder is pointed at an empty folder, so anything the verifier leaves in Temp shows up as an entry.
		process.env["TEMP"] = tempRoot;
		process.env["TMP"] = tempRoot;
		process.env["TMPDIR"] = tempRoot;
	});

	afterEach(() =>
	{
		for (const [name, value] of Object.entries(savedEnvironment))
		{
			if (value === undefined) delete process.env[name];
			else process.env[name] = value;
		}
	});

	/** Writes `solutions/<id>/<id>.cpp` for each quest id. */
	async function writeSolutions(ids: string[]): Promise<void>
	{
		for (const id of ids)
		{
			await mkdir(join(solutionsFolder, id), { recursive: true });
			await writeFile(join(solutionsFolder, id, `${id}.cpp`), "SOLUTION");
		}
	}

	/** Runs the verifier over the quests with the real sandbox on `tooling`. */
	async function verify(tooling: FakeTooling, ids: string[], signal?: AbortSignal): ReturnType<EngineVerifier["verify"]>
	{
		const verifier = new EngineVerifier({
			target: tooling.target,
			templateFolder: resolve("resources/sandbox-template"),
			solutionsFolder,
			log: () => undefined,
			workspaceRoot,
			...(signal === undefined ? {} : { signal }),
		});
		const records: QuestRecord[] = ids.map((id) => ({ quest: quest(id), file: `examples/${id}.md` }));

		return track(verifier.verify(records));
	}

	it("leaves Temp exactly as it was after a pass, a failure, a crash mid-build and a cancel, and reuses one workspace", async () =>
	{
		const tooling = fakeTooling();

		expect(await readdir(tempRoot)).toEqual([]);
		expect(tmpdir()).toBe(tempRoot);

		await writeSolutions(["a", "b"]);

		const passed = await verify(tooling, ["a", "b"]);

		expect(passed.problems).toEqual([]);
		expect(await readdir(tempRoot)).toEqual([]);

		tooling.behaviour.failTests = true;

		const failed = await verify(tooling, ["a", "b"]);

		expect(failed.problems.length).toBeGreaterThan(0);
		expect(failed.logsFolder?.startsWith(resolve(workspaceRoot))).toBe(true);
		expect(await readdir(tempRoot)).toEqual([]);

		tooling.behaviour.failTests = false;
		tooling.behaviour.throwOnBuild = tooling.projectFolders.length + 2;

		await expect(verify(tooling, ["a", "b"])).rejects.toThrow("the build tool crashed");
		expect(await readdir(tempRoot)).toEqual([]);

		delete tooling.behaviour.throwOnBuild;

		const controller = new AbortController();

		tooling.behaviour.abortOnBuild = controller;

		const cancelled = await verify(tooling, ["a", "b"], controller.signal);

		expect(cancelled.cancelled).toBe(true);
		expect(await readdir(tempRoot)).toEqual([]);

		// One workspace folder for 5.8, reused by every run (its build output from the first run is still there), and no lock left behind.
		expect(await entriesOf(workspaceRoot)).toEqual(["5.8"]);
		expect(new Set(tooling.projectFolders).size).toBe(1);
		expect(await readFile(join(workspaceRoot, "5.8", "Binaries", "built.marker"), "utf8")).not.toBe("");

		// The run after a crash can take the workspace again, so the crash released its lock.
		tooling.behaviour = {};

		expect((await verify(tooling, ["a", "b"])).problems).toEqual([]);
	}, 60_000);

	it("removes a quest left by the last run before the next build", async () =>
	{
		const tooling = fakeTooling();

		await writeSolutions(["a", "b"]);
		await verify(tooling, ["a", "b"]);

		// Only "a" now: "b" from the last run must not be in the project when it builds.
		await verify(tooling, ["a"]);

		const secondRunBuilds = tooling.questFoldersAtBuild.slice(-2);

		expect(tooling.questFoldersAtBuild[0]).toEqual(["a", "b", "sample-health"]);
		expect(secondRunBuilds.every((folders) => !folders.includes("b"))).toBe(true);
		expect(secondRunBuilds[0]).toEqual(["a", "sample-health"]);
		expect(await entriesOf(join(workspaceRoot, "5.8", "Source", "Dojo", "Tests"))).not.toContain("b.Test.cpp");
	}, 30_000);

	it("keeps the logs of only the last few runs, inside the workspace", async () =>
	{
		const tooling = fakeTooling();

		// Failing tests mean one build per run and no starter checks, which keeps seven runs quick (each still waits out the 1.1 s gap).
		tooling.behaviour.failTests = true;

		await writeSolutions(["a"]);

		for (let run = 0; run < 7; run++) await verify(tooling, ["a"]);

		const logs = await entriesOf(join(workspaceRoot, "5.8", "Saved", "VerifierLogs"));

		expect(logs).toHaveLength(5);
		expect(await readdir(join(workspaceRoot, "5.8", "Saved", "VerifierLogs", logs[4] ?? ""))).toContain("build-1.log");
		expect(await readdir(tempRoot)).toEqual([]);
	}, 60_000);

	it("reports a workspace it cannot prepare as a problem instead of throwing", async () =>
	{
		const tooling = fakeTooling();

		await writeSolutions(["a"]);
		await mkdir(join(scratch, "cache"), { recursive: true });
		await writeFile(join(scratch, "cache", "verify-workspace"), "a file where the folder should be");

		const report = await verify(tooling, ["a"]);

		expect(report.problems.map((problem) => problem.message).join("\n")).toContain("could not prepare the verify workspace");
		expect(await readdir(tempRoot)).toEqual([]);
	});

	it("keeps the timestamp gap after a build across runs: a file the next run writes is newer than the last build's end by more than a second", async () =>
	{
		const tooling = fakeTooling();
		const template = join(scratch, "template");

		await mkdir(join(template, "Source", "Dojo", "Quests"), { recursive: true });
		await writeFile(join(template, "Dojo.uproject"), JSON.stringify({ FileVersion: 3, EngineAssociation: "", Plugins: [] }));
		await writeFile(join(template, "Source", "Dojo", "Dojo.cpp"), "version 1");

		const first = await EngineSandbox.create(template, tooling.target, { workspaceRoot });

		await first.build();

		const buildEnded = Date.now();

		await first.release();
		await writeFile(join(template, "Source", "Dojo", "Dojo.cpp"), "version 2");

		const second = await EngineSandbox.create(template, tooling.target, { workspaceRoot });
		const rewritten = (await stat(join(second.folder, "Source", "Dojo", "Dojo.cpp"))).mtimeMs;

		await second.release();

		expect(await readFile(join(second.folder, "Source", "Dojo", "Dojo.cpp"), "utf8")).toBe("version 2");
		expect(rewritten - buildEnded).toBeGreaterThan(1_000);
	}, 30_000);

	it("makes a second verifier wait for the first and then reuse the same workspace", async () =>
	{
		const target = fakeTooling().target;
		const first = await EngineSandbox.create(resolve("resources/sandbox-template"), target, { workspaceRoot, lock: { pollMilliseconds: 10 } });
		let secondFolder = "";
		const second = track(EngineSandbox.create(resolve("resources/sandbox-template"), target, { workspaceRoot, lock: { pollMilliseconds: 10 } }).then((sandbox) =>
		{
			secondFolder = sandbox.folder;

			return sandbox;
		}));

		await new Promise((resolveWait) => setTimeout(resolveWait, 80));

		expect(secondFolder).toBe("");

		await first.release();

		const sandbox = await second;

		expect(secondFolder).toBe(first.folder);

		await sandbox.release();

		expect(await entriesOf(workspaceRoot)).toEqual(["5.8"]);
		expect(await readdir(tempRoot)).toEqual([]);
	});
});
