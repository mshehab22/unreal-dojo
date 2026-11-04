// Checks how a crash is read out of one run's engine output: the real fatal shape, the shapes from the engine source, and the cases that must not read as a crash.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { describeEngineCrash, EngineCrashReader, MAX_CRASH_REASON_LENGTH } from "../../src/main/services/unreal/EngineCrashReader";

/** The lines of a fixture file. */
function fixtureLines(name: string): string[]
{
	return readFileSync(join(__dirname, "fixtures", "engine-crash", name), "utf8").split(/\r?\n/);
}

/** The quest test the real fixture was running. */
const SAVE_TEST = "Dojo.S3.Saveable.OnlySaveGameTravels";

/** A test starting, as the automation controller prints it. */
function started(shortName: string, path: string): string
{
	return `[2026.11.03-22.30.08:541][597]LogAutomationController: Display: Test Started. Name={${shortName}} Path={${path}}`;
}

const reader = new EngineCrashReader();

describe("EngineCrashReader", () =>
{
	it("reads the real Windows crash: the message on the line after the fatal line, and the test that was running", () =>
	{
		const crash = reader.read(fixtureLines("farchive-object-ptr-windows.txt"), [SAVE_TEST]);

		expect(crash).toEqual({ reason: "FArchive does not support FObjectPtr serialization. Use FArchiveUObject instead.", runningTest: "OnlySaveGameTravels", testsStarted: true });
	});

	it("reads the same crash from lines with no timestamp or category, as a bare output stream may print them", () =>
	{
		const crash = reader.read(["Fatal error: [File:D:\\build\\Archive.cpp] [Line: 523] ", "FArchive does not support FObjectPtr serialization. Use FArchiveUObject instead."], [SAVE_TEST]);

		expect(crash?.reason).toBe("FArchive does not support FObjectPtr serialization. Use FArchiveUObject instead.");
	});

	it("reads a failed check as plain words with its expression and message (shape from the engine source)", () =>
	{
		const crash = reader.read(["LogCore: Error: appError called: Assertion failed: Health > 0 [File:/Users/learner/Sandbox/Source/Dojo/Quests/q/Health.cpp] [Line: 12] Health must be positive"], []);

		expect(crash?.reason).toBe("a check in the code failed: Health > 0 (Health must be positive)");
	});

	it("reads a memory crash as plain words and keeps the engine's own name for it (shape from the engine source)", () =>
	{
		const windows = reader.read(["[2026.11.03-22.30.11:492][598]LogWindows: Error: Unhandled Exception: EXCEPTION_ACCESS_VIOLATION reading address 0x0000000000000000"], []);
		const mac = reader.read(["LogCore: Error: Caught signal 11 Segmentation fault"], []);

		expect(windows?.reason).toBe("the code used memory it does not own (EXCEPTION_ACCESS_VIOLATION reading address 0x0000000000000000)");
		expect(mac?.reason).toBe("the code used memory it does not own (Segmentation fault)");
	});

	it("finds nothing in ordinary output, warnings, or a learner's own error text under their own log category", () =>
	{
		const lines = [
			"LogInit: Display: Engine is initialized.",
			"LogOutputDevice: Warning: Script Stack (0 frames) :",
			"LogTemp: Error: Fatal error: this is the learner's own message",
			"LogTemp: Error: Assertion failed: not a real one [File:x.cpp] [Line: 1]",
			"Result: Failed",
		];

		expect(reader.read(lines, [SAVE_TEST])).toBeUndefined();
		expect(reader.read([], [SAVE_TEST])).toBeUndefined();
	});

	it("reads the message of a failed check from the line after it when none is on the same line (M5.1n)", () =>
	{
		const crash = reader.read([
			"LogWindows: Error: appError called: Assertion failed: Index >= 0 && Index < ArrayNum [File:D:\\build\\Array.h] [Line: 749]",
			"Array index out of bounds: 3 from an array of size 3",
			"",
		], []);

		expect(crash?.reason).toBe("a check in the code failed: Index >= 0 && Index < ArrayNum (Array index out of bounds: 3 from an array of size 3)");
	});

	it("keeps a failed check's own message over the next line, and does not take another log message for it", () =>
	{
		const sameLine = reader.read(["Assertion failed: A [File:a.cpp] [Line: 1] Own words", "Next line"], []);
		const otherLog = reader.read(["Assertion failed: A [File:a.cpp] [Line: 1]", "LogWindows: Windows GetLastError: The operation completed successfully. (0)"], []);

		expect(sameLine?.reason).toBe("a check in the code failed: A (Own words)");
		expect(otherLog?.reason).toBe("a check in the code failed: A");
	});

	it("does not read a learner's own category that only starts with an engine category name (A1862, M5.1n)", () =>
	{
		const lines = ["LogCoreGame: Error: Fatal error: mine", "LogMacGuffin: Error: Assertion failed: x [File:a.cpp] [Line: 1]", "LogWindowsPlus: Error: Unhandled Exception: EXCEPTION_ACCESS_VIOLATION"];

		expect(reader.read(lines, [])).toBeUndefined();
	});

	it("does not take another log message after an empty fatal message as the reason (M5.1n)", () =>
	{
		const crash = reader.read([
			"LogWindows: Error: appError called: Fatal error: [File:a.cpp] [Line: 1] ",
			"LogWindows: Windows GetLastError: The operation completed successfully. (0)",
		], []);

		expect(crash?.reason).toBe("the engine hit a fatal error");
	});

	it("keeps a message that starts with letters like Log but is not a log category, such as LogicError or Login (M5.1n)", () =>
	{
		const logic = reader.read(["LogWindows: Error: appError called: Fatal error: [File:a.cpp] [Line: 1] ", "LogicError: door has no owner"], []);
		const login = reader.read(["LogWindows: Error: appError called: Fatal error: [File:a.cpp] [Line: 1] ", "Login: no player"], []);

		expect(logic?.reason).toBe("LogicError: door has no owner");
		expect(login?.reason).toBe("Login: no player");
	});

	it("does not take the critical error banner as the message of an empty check (M5.1n)", () =>
	{
		const crash = reader.read(["LogWindows: Error: appError called: Assertion failed: P [File:a.cpp] [Line: 1]", "LogWindows: Error: === Critical error: ==="], []);

		expect(crash?.reason).toBe("a check in the code failed: P");
	});

	it("still reads the message from an engine error line in the critical error block", () =>
	{
		const crash = reader.read([
			"LogWindows: Error: Fatal error: [File:a.cpp] [Line: 1] ",
			"LogWindows: Error: FArchive does not support FObjectPtr serialization.",
		], []);

		expect(crash?.reason).toBe("FArchive does not support FObjectPtr serialization.");
	});

	it("shows only the first fatal line when there are several", () =>
	{
		const crash = reader.read(["LogWindows: Error: appError called: Assertion failed: A [File:a.cpp] [Line: 1]", "LogWindows: Error: Unhandled Exception: EXCEPTION_ACCESS_VIOLATION"], []);

		expect(crash?.reason).toBe("a check in the code failed: A");
	});

	it("cuts a very long reason to the cap with three dots and one line", () =>
	{
		const crash = reader.read([`LogWindows: Error: appError called: Fatal error: [File:a.cpp] [Line: 1] ${"word ".repeat(200)}`], []);

		expect(crash?.reason.length).toBe(MAX_CRASH_REASON_LENGTH);
		expect(crash?.reason.endsWith("...")).toBe(true);
		expect(crash?.reason).not.toMatch(/[\r\n]/);
	});

	it("says a fatal error with no message found, instead of nothing", () =>
	{
		expect(reader.read(["LogWindows: Error: appError called: Fatal error: [File:a.cpp] [Line: 1] "], [])?.reason).toBe("the engine hit a fatal error");
	});

	it("does not read a callstack line as the message", () =>
	{
		const crash = reader.read(["LogWindows: Error: Fatal error: [File:a.cpp] [Line: 1] ", "LogWindows: Error: [Callstack] 0x00007ffe UnrealEditor-Core.dll!UnknownFunction []"], []);

		expect(crash?.reason).toBe("the engine hit a fatal error");
	});

	it("names a running test only when it is one of this quest's, and not once it has completed", () =>
	{
		const fatal = "LogWindows: Error: Unhandled Exception: EXCEPTION_ACCESS_VIOLATION";
		const other = reader.read([started("Other", "Dojo.Other.Quest.Other"), fatal], [SAVE_TEST]);
		const finished = reader.read([started("First", "Dojo.A.First"), "LogAutomationController: Display: Test Completed. Result={Success} Name={First} Path={Dojo.A.First}", fatal], ["Dojo.A.First"]);
		const running = reader.read([started("First", "Dojo.A.First"), "LogAutomationController: Display: Test Completed. Result={Success} Name={First} Path={Dojo.A.First}", started("Second", "Dojo.A.Second"), fatal], ["Dojo.A.First", "Dojo.A.Second"]);

		expect(other).toMatchObject({ testsStarted: false });
		expect(other?.runningTest).toBeUndefined();
		expect(finished).toMatchObject({ testsStarted: true });
		expect(finished?.runningTest).toBeUndefined();
		expect(running).toMatchObject({ testsStarted: true, runningTest: "Second" });
	});
});

describe("describeEngineCrash", () =>
{
	it("blames the learner's code only when a test of the quest was running or had started", () =>
	{
		expect(describeEngineCrash({ reason: "x went wrong", runningTest: "Saves", testsStarted: true }, 3)).toBe("Your code stopped the engine while the test Saves was running, so no test report was written (exit code 3). The engine said: x went wrong.");
		expect(describeEngineCrash({ reason: "x went wrong.", testsStarted: true }, 3)).toBe("Your code stopped the engine while your tests were running, so no test report was written (exit code 3). The engine said: x went wrong.");
		expect(describeEngineCrash({ reason: "x went wrong", testsStarted: false }, 3)).toBe("The engine crashed and stopped before writing a test report (exit code 3). The engine said: x went wrong.");
	});

	it("uses no em dash", () =>
	{
		expect(describeEngineCrash({ reason: "r", runningTest: "T", testsStarted: true }, null)).not.toContain("\u2014");
	});
});
