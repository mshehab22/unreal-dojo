// Checks every rule of the loop choice on Windows and macOS, and the Live Coding answer reader.
import { describe, expect, it } from "vitest";

import { chooseLoop, type LoopChoiceInput } from "../../src/main/services/unreal/chooseLoop";
import { readLiveCodingAnswer } from "../../src/main/services/unreal/LiveCodingAnswer";

const HEADER = "#pragma once\nUCLASS()\nclass UHealth : public UActorComponent { GENERATED_BODY() UPROPERTY() float Health; };";
const SOURCE = "void UHealth::TakeDamage(float Amount) { Health -= Amount; }";
const TESTS = "IMPLEMENT_SIMPLE_AUTOMATION_TEST(F, \"Dojo.Sample.Health.TakesDamage\", 0)";

/** A run where everything allows the fast loop: editor open since t=100, quest built at t=50 with the same files. */
function input(overrides: Partial<LoopChoiceInput> = {}): LoopChoiceInput
{
	const files = { "Health.h": HEADER, "Health.cpp": SOURCE };

	return {
		loopMode: "auto",
		engineSupportsFastLoop: true,
		liveCodingAvailable: true,
		editor: { launchedAt: 100, answering: true },
		lastFullBuildAt: 50,
		builtSnapshot: { files, tests: TESTS, builtAt: 50 },
		sandboxChangedSinceBuild: false,
		files,
		tests: TESTS,
		...overrides,
	};
}

describe("chooseLoop, rules for both platforms", () =>
{
	it("honors the headless setting", () =>
	{
		expect(chooseLoop(input({ loopMode: "headless" }))).toEqual({ loop: "headless", reason: "Full build: the headless loop is set in Settings.", editorStale: false });
	});

	it("goes headless on engines older than 5.8, with no editor, or when the editor does not answer", () =>
	{
		expect(chooseLoop(input({ engineSupportsFastLoop: false })).reason).toMatch(/older than 5\.8/);
		expect(chooseLoop(input({ editor: null })).reason).toMatch(/editor is not open/);
		expect(chooseLoop(input({ editor: { launchedAt: 100, answering: false } })).reason).toMatch(/not answering/);
	});

	it("goes headless on both platforms when other quests' files changed since the last full build", () =>
	{
		for (const liveCodingAvailable of [true, false])
		{
			expect(chooseLoop(input({ liveCodingAvailable, sandboxChangedSinceBuild: true }))).toEqual({ loop: "headless", reason: "Full build: other quests' files in the sandbox changed since the last full build.", editorStale: false });
		}
	});

	it("explains when a fast loop set in Settings cannot be used", () =>
	{
		expect(chooseLoop(input({ loopMode: "fast", editor: null })).reason).toBe("Fast loop is set in Settings, but full build: the editor is not open (open it from Unreal Dojo for the fast loop).");
	});
});

describe("chooseLoop on Windows (Live Coding)", () =>
{
	it("uses the fast loop for a .cpp change", () =>
	{
		const choice = chooseLoop(input({ files: { "Health.h": HEADER, "Health.cpp": `${SOURCE}\n// tweak` } }));

		expect(choice.loop).toBe("fast");
		expect(choice.reason).toMatch(/Live Coding/);
	});

	it("uses the fast loop when a header without reflection macros changes", () =>
	{
		const plainHeader = "#pragma once\ninline int Twice(int Value) { return Value * 2; }";
		const built = { "Math.h": plainHeader, "Health.cpp": SOURCE };

		expect(chooseLoop(input({ builtSnapshot: { files: built, tests: TESTS, builtAt: 50 }, files: { ...built, "Math.h": `${plainHeader}\n` } })).loop).toBe("fast");
	});

	it("needs a full build when a reflected header changes", () =>
	{
		const choice = chooseLoop(input({ files: { "Health.h": HEADER.replace("float Health", "float Health = 100.f"), "Health.cpp": SOURCE } }));

		expect(choice).toEqual({ loop: "headless", reason: "Full build: Health.h declares reflected types and changed since the last full build.", editorStale: false });
	});

	it("needs a full build when a file is added, when the quest was never built, or when its tests changed", () =>
	{
		expect(chooseLoop(input({ files: { "Health.h": HEADER, "Health.cpp": SOURCE, "Extra.cpp": "" } })).reason).toMatch(/added or removed/);
		expect(chooseLoop(input({ builtSnapshot: null })).reason).toMatch(/not been fully built/);
		expect(chooseLoop(input({ tests: `${TESTS}\n` })).reason).toMatch(/tests changed/);
	});

	it("needs a full build when the quest's record is not from the latest build: Q built, Q's reference written with a new UPROPERTY, R built, editor opened, Q's draft run (re-review)", () =>
	{
		// Q's draft was built at t=10; the reference write was absorbed by R's build at t=50; the editor opened at t=100 with the reference's header loaded.
		const draft = { "Health.h": HEADER, "Health.cpp": SOURCE };
		const choice = chooseLoop(input({ builtSnapshot: { files: draft, tests: TESTS, builtAt: 10 }, lastFullBuildAt: 50, sandboxChangedSinceBuild: false, files: draft }));

		expect(choice.loop).toBe("headless");
		expect(choice.reason).toMatch(/another quest was built after this one/);
	});

	it("marks the editor stale when a build finished after it opened", () =>
	{
		expect(chooseLoop(input({ lastFullBuildAt: 150 }))).toMatchObject({ loop: "headless", editorStale: true });
	});
});

describe("chooseLoop on macOS (no Live Coding, A45)", () =>
{
	const mac = (overrides: Partial<LoopChoiceInput> = {}): LoopChoiceInput => input({ liveCodingAvailable: false, ...overrides });

	it("re-runs tests in the editor when the code is unchanged since the editor loaded it", () =>
	{
		expect(chooseLoop(mac())).toEqual({ loop: "fast", reason: "Fast loop: the code is unchanged since the editor loaded it, so only the tests run again.", editorStale: false });
	});

	it("needs a full build for any code change, even in a .cpp", () =>
	{
		const choice = chooseLoop(mac({ files: { "Health.h": HEADER, "Health.cpp": `${SOURCE} ` } }));

		expect(choice).toEqual({ loop: "headless", reason: "Full build: the code changed, and Live Coding is not available on the Mac.", editorStale: false });
	});

	it("needs a full build when the quest was never built", () =>
	{
		expect(chooseLoop(mac({ builtSnapshot: null })).loop).toBe("headless");
	});

	it("needs a full build when another quest was built after this one, even with the editor opened after both", () =>
	{
		const choice = chooseLoop(mac({ lastFullBuildAt: 80 }));

		expect(choice.loop).toBe("headless");
		expect(choice.reason).toMatch(/another quest was built after this one/);
	});

	it("marks the editor stale after a build that finished while it was open, and offers a restart", () =>
	{
		const files = { "Health.h": HEADER, "Health.cpp": SOURCE };
		const choice = chooseLoop(mac({ lastFullBuildAt: 150, builtSnapshot: { files, tests: TESTS, builtAt: 150 } }));

		expect(choice.loop).toBe("headless");
		expect(choice.editorStale).toBe(true);
		expect(choice.reason).toMatch(/Restart the editor/);
	});
});

describe("readLiveCodingAnswer", () =>
{
	it("reads structured result names", () =>
	{
		expect(readLiveCodingAnswer(JSON.stringify({ result: "Success", log: "done" }))).toEqual({ status: "succeeded", output: "done" });
		expect(readLiveCodingAnswer(JSON.stringify({ Result: "ELiveCodingCompileResult::NoChanges" })).status).toBe("no-changes");
		expect(readLiveCodingAnswer(JSON.stringify({ status: "Failure", log: "Health.cpp(3): error C2065: 'Helth': undeclared identifier" }))).toEqual({ status: "failed", output: "Health.cpp(3): error C2065: 'Helth': undeclared identifier" });
		expect(readLiveCodingAnswer(JSON.stringify({ status: "CompileStillActive" })).status).toBe("busy");
	});

	it("reads the Mac's plain answer as unavailable (verified text, M1.2a)", () =>
	{
		expect(readLiveCodingAnswer("Error: Live Coding is not available in this build configuration.").status).toBe("unavailable");
	});

	it("reads plain text answers", () =>
	{
		expect(readLiveCodingAnswer("Live coding succeeded").status).toBe("succeeded");
		expect(readLiveCodingAnswer("No changes detected").status).toBe("no-changes");
		expect(readLiveCodingAnswer("Health.cpp(3): error C2065").status).toBe("failed");
		expect(readLiveCodingAnswer("Changes to class layout are not supported; restart required").status).toBe("needs-full-build");
	});

	it("treats an answer it does not recognise as needing a full build", () =>
	{
		expect(readLiveCodingAnswer("{\"something\": 1}").status).toBe("needs-full-build");
	});
});
