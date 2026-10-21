// Checks where quest files land, that they are written fresh, and that unsafe names are refused.
import { describe, expect, it } from "vitest";

import { MacPlatformPaths } from "../../src/main/services/unreal/MacPlatformPaths";
import { QuestFileWriter } from "../../src/main/services/unreal/QuestFileWriter";
import { FakeSandboxFileSystem } from "./FakeSandboxFileSystem";

/** A quest with one test. */
const QUEST = { id: "w1-health", title: "Health that can run out", tests: "IMPLEMENT_SIMPLE_AUTOMATION_TEST(FA, \"Dojo.W1.Health.TakesDamage\", F)" };

/** A writer over an in-memory sandbox. */
function createWriter(files: Record<string, string> = {})
{
	const fileSystem = new FakeSandboxFileSystem(files);

	return { fileSystem, writer: new QuestFileWriter(new MacPlatformPaths("/Users/learner"), fileSystem) };
}

describe("QuestFileWriter", () =>
{
	it("writes learner files unchanged under Quests/<quest-id> and the tests under Tests/<quest-id>.Test.cpp with a header", async () =>
	{
		const { fileSystem, writer } = createWriter();

		await writer.write("/Sandbox", QUEST, { "DojoHealth.h": "#pragma once\n", "DojoHealth.cpp": "#include \"DojoHealth.h\"\n" });

		expect(fileSystem.files.get("/Sandbox/Source/Dojo/Quests/w1-health/DojoHealth.h")).toBe("#pragma once\n");
		expect(fileSystem.files.get("/Sandbox/Source/Dojo/Quests/w1-health/DojoHealth.cpp")).toBe("#include \"DojoHealth.h\"\n");

		const tests = fileSystem.files.get("/Sandbox/Source/Dojo/Tests/w1-health.Test.cpp") ?? "";
		expect(tests.split("\n")[0]).toBe("// Quest test: w1-health (Health that can run out). Written by Unreal Dojo; edits here are replaced on the next run.");
		expect(tests).toContain(QUEST.tests);
	});

	it("writes every file again on each run, even unchanged ones, and removes files the learner no longer has", async () =>
	{
		const { fileSystem, writer } = createWriter({ "/Sandbox/Source/Dojo/Quests/w1-health/Old.cpp": "old", "/Sandbox/Source/Dojo/Quests/w1-health/DojoHealth.h": "same" });

		await writer.write("/Sandbox", QUEST, { "DojoHealth.h": "same" });

		expect(fileSystem.writes).toContain("/Sandbox/Source/Dojo/Quests/w1-health/DojoHealth.h");
		expect(fileSystem.files.has("/Sandbox/Source/Dojo/Quests/w1-health/Old.cpp")).toBe(false);
	});

	it("refuses file names with folders, parent steps, or other extensions, and unsafe quest ids", async () =>
	{
		const { writer } = createWriter();

		await expect(writer.write("/Sandbox", QUEST, { "../Dojo.Build.cs": "" })).rejects.toThrow(/Unsafe quest file name/);
		await expect(writer.write("/Sandbox", QUEST, { "sub/A.cpp": "" })).rejects.toThrow(/Unsafe quest file name/);
		await expect(writer.write("/Sandbox", QUEST, { "notes.txt": "" })).rejects.toThrow(/Unsafe quest file name/);
		await expect(writer.write("/Sandbox", { ...QUEST, id: "../evil" }, {})).rejects.toThrow(/Unsafe quest id/);
	});

	it("removes a quest's folder and test file on reset", async () =>
	{
		const { fileSystem, writer } = createWriter({ "/Sandbox/Source/Dojo/Quests/w1-health/A.cpp": "a", "/Sandbox/Source/Dojo/Tests/w1-health.Test.cpp": "t", "/Sandbox/Source/Dojo/Tests/other.Test.cpp": "keep" });

		await writer.remove("/Sandbox", "w1-health");

		expect([...fileSystem.files.keys()]).toEqual(["/Sandbox/Source/Dojo/Tests/other.Test.cpp"]);
	});
});
