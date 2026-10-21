// Checks the small process pieces: line splitting, log filtering, tree killers, and the supervised run (timeout, cancel, exit).
import { describe, expect, it } from "vitest";

import { LineSplitter } from "../../src/main/services/unreal/LineSplitter";
import { LogFilter } from "../../src/main/services/unreal/LogFilter";
import { PosixProcessTreeKiller } from "../../src/main/services/unreal/PosixProcessTreeKiller";
import { runSupervised } from "../../src/main/services/unreal/SupervisedProcess";
import { WindowsProcessTreeKiller } from "../../src/main/services/unreal/WindowsProcessTreeKiller";
import { FakeProcessLauncher } from "./FakeProcessLauncher";
import { FakeTimer } from "./FakeTimer";

/** A spec the supervised tests do not care about. */
const SPEC = { command: "tool", commandArguments: [], verbatimArguments: false };

describe("LineSplitter", () =>
{
	it("joins chunks into lines, handles CRLF, and flushes the last partial line", () =>
	{
		const lines: string[] = [];
		const splitter = new LineSplitter((line) => lines.push(line));

		splitter.push("first li");
		splitter.push("ne\r\nsecond\nthi");
		splitter.flush();

		expect(lines).toEqual(["first line", "second", "thi"]);
	});
});

describe("LogFilter", () =>
{
	const filter = new LogFilter();

	it("keeps errors, warnings, and quest or test lines with either slash", () =>
	{
		expect(filter.keep("/Sandbox/Source/Dojo/Quests/w1/Health.cpp:12:5: error: use of undeclared identifier 'Healt'")).toBe(true);
		expect(filter.keep("Source\\Dojo\\Tests\\w1.Test.cpp(4): warning C4996: deprecated")).toBe(true);
		expect(filter.keep("[3/10] Compile [Apple] Module.Dojo.cpp")).toBe(false);
		expect(filter.keep("Using bundled DotNet SDK version: 8.0.300")).toBe(false);
		expect(filter.keep("@progress 'Compiling C++ source code...' 40%")).toBe(false);
	});

	it("reads a percent from UBT progress lines and action counts", () =>
	{
		expect(filter.progressPercent("@progress 'Compiling C++ source code...' 45%")).toBe(45);
		expect(filter.progressPercent("[3/12] Compile [Apple] SampleHealthComponent.cpp")).toBe(25);
		expect(filter.progressPercent("Result: Succeeded")).toBeNull();
	});
});

describe("process tree killers", () =>
{
	it("signals the process group and the process on macOS, and ignores a process that is gone", () =>
	{
		const signals: [number, string][] = [];
		const killer = new PosixProcessTreeKiller((processId, signal) =>
		{
			signals.push([processId, signal]);
			if (processId > 0) throw new Error("ESRCH");
		});

		killer.killTree(4321);

		expect(killer.startsOwnProcessGroup).toBe(true);
		expect(signals).toEqual([[-4321, "SIGKILL"], [4321, "SIGKILL"]]);
	});

	it("runs taskkill for the whole tree on Windows", () =>
	{
		const commands: string[] = [];
		const killer = new WindowsProcessTreeKiller((command, commandArguments) => commands.push([command, ...commandArguments].join(" ")));

		killer.killTree(77);

		expect(killer.startsOwnProcessGroup).toBe(false);
		expect(commands).toEqual(["taskkill /PID 77 /T /F"]);
	});
});

describe("runSupervised", () =>
{
	it("collects lines and resolves with the exit code", async () =>
	{
		const launcher = new FakeProcessLauncher([{ lines: ["a", "b"], exitCode: 3 }]);
		const seen: string[] = [];

		const outcome = await runSupervised(launcher, new FakeTimer(), SPEC, 1000, new AbortController().signal, (line) => seen.push(line));

		expect(outcome).toMatchObject({ exitCode: 3, started: true, timedOut: false, cancelled: false, lines: ["a", "b"] });
		expect(seen).toEqual(["a", "b"]);
		expect(launcher.killCount).toBe(0);
	});

	it("kills the tree when the time limit passes", async () =>
	{
		const launcher = new FakeProcessLauncher([{ hangs: true }]);
		const timer = new FakeTimer();

		const pending = runSupervised(launcher, timer, SPEC, 1000, new AbortController().signal, () => undefined);
		timer.advance(1000);
		const outcome = await pending;

		expect(outcome.timedOut).toBe(true);
		expect(outcome.exitCode).toBeNull();
		expect(outcome.durationMs).toBe(1000);
		expect(launcher.killCount).toBeGreaterThanOrEqual(1);
	});

	it("kills the tree on cancel", async () =>
	{
		const launcher = new FakeProcessLauncher([{ hangs: true }]);
		const controller = new AbortController();

		const pending = runSupervised(launcher, new FakeTimer(), SPEC, 1000, controller.signal, () => undefined);
		controller.abort();
		const outcome = await pending;

		expect(outcome.cancelled).toBe(true);
		expect(launcher.killCount).toBeGreaterThanOrEqual(1);
	});

	it("does not start at all when already cancelled", async () =>
	{
		const launcher = new FakeProcessLauncher([]);
		const controller = new AbortController();
		controller.abort();

		const outcome = await runSupervised(launcher, new FakeTimer(), SPEC, 1000, controller.signal, () => undefined);

		expect(outcome.cancelled).toBe(true);
		expect(launcher.specs).toHaveLength(0);
	});

	it("reports a program that cannot start", async () =>
	{
		const outcome = await runSupervised(new FakeProcessLauncher([{ failsToStart: true }]), new FakeTimer(), SPEC, 1000, new AbortController().signal, () => undefined);

		expect(outcome.started).toBe(false);
		expect(outcome.startError).toContain("ENOENT");
	});
});
