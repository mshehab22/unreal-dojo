// Checks the macOS snippet check: the response file, line-preserving rewrites, header errors mapped to snippet lines, exit codes, timeouts, and per-check files (A403, A410, A411).
import { describe, expect, it } from "vitest";

import { ClangSnippetSyntaxChecker, parseDiagnostics, resultOf, snippetResponseFile } from "../../src/main/services/unreal/ClangSnippetSyntaxChecker";
import { prepareSnippet } from "../../src/main/services/unreal/snippetSource";
import type { CommandResult, CommandRunner } from "../../src/main/services/unreal/CommandRunner";
import { MacPlatformPaths } from "../../src/main/services/unreal/MacPlatformPaths";
import { FakeCommandRunner } from "./FakeCommandRunner";
import { FakeSandboxFileSystem } from "./FakeSandboxFileSystem";

/** A trimmed donor response file in UBT's format. */
const DONOR = ["-c", "-pipe", "-Werror", "-fdiagnostics-color", "-I\".\"", "-include-pch \"/S/Intermediate/pch.gch\"", "-x objective-c++", "\"/S/Source/Dojo/Support/DojoTestActor.cpp\"", "-MD -MF\"/S/x.d\"", "-o \"/S/x.o\""].join("\n");

/** Where the donor sits in a built sandbox. */
const DONOR_PATH = "/S/Intermediate/Build/Mac/arm64/UnrealEditor/Development/Dojo/DojoTestActor.cpp.o.rsp";

/** This check's snippet file, with the fixed test id. */
const SNIPPET = "/S/Intermediate/DojoSnippets/Snippet-one.cpp";

/** A checker over fakes whose checks are named one, two, three... */
function createChecker(commandRunner: CommandRunner, fileSystem = new FakeSandboxFileSystem({ [DONOR_PATH]: DONOR }))
{
	const ids = ["one", "two", "three"];
	const checker = new ClangSnippetSyntaxChecker(new MacPlatformPaths("/Users/learner"), fileSystem, commandRunner, () => ids.shift() ?? "later");

	return { checker, fileSystem };
}

describe("snippet preparation", () =>
{
	it("keeps the donor's flags and swaps its source, output, and -Werror for the prelude, -fsyntax-only, and the snippet", () =>
	{
		expect(snippetResponseFile(DONOR, "/S/Intermediate/DojoSnippets/SnippetPrelude-one.h", SNIPPET).split("\n")).toEqual([
			"-pipe",
			"-I\".\"",
			"-include-pch \"/S/Intermediate/pch.gch\"",
			"-x objective-c++",
			"-include \"/S/Intermediate/DojoSnippets/SnippetPrelude-one.h\"",
			"-fsyntax-only",
			"-fno-color-diagnostics",
			"-Wno-pragma-once-outside-header",
			"-Wno-infinite-recursion",
			`"${SNIPPET}"`,
			"",
		]);
	});

	it("blanks generated.h includes and Super:: without moving lines or columns", () =>
	{
		expect(prepareSnippet("#include \"Lantern.generated.h\"\n\tvoid BeginPlay() override { Super::BeginPlay(); }")).toBe("\n\tvoid BeginPlay() override {        BeginPlay(); }");
		expect(prepareSnippet("Super::BeginPlya();")).toBe("       BeginPlya();");
	});
});

describe("parseDiagnostics", () =>
{
	it("keeps the snippet's own errors and warnings in order, and drops UHT artifacts", () =>
	{
		const output = [
			`${SNIPPET}:8:52: error: use of undeclared identifier 'DeltaSecs'; did you mean 'DeltaSeconds'?`,
			`${SNIPPET}:8:18: note: 'DeltaSeconds' declared here`,
			`${SNIPPET}:6:3: error: use of undeclared identifier 'Super'`,
			`${SNIPPET}:2:5: warning: unused variable 'Count' [-Wunused-variable]`,
		].join("\n");

		expect(parseDiagnostics(output, SNIPPET)).toEqual([
			{ line: 2, column: 5, severity: "warning", message: "unused variable 'Count' [-Wunused-variable]" },
			{ line: 8, column: 52, severity: "error", message: "use of undeclared identifier 'DeltaSecs'; did you mean 'DeltaSeconds'?" },
		]);
	});

	it("puts a template error from an engine header on the snippet line that instantiated it", () =>
	{
		const output = [
			"/Engine/Source/Runtime/Core/Public/Templates/SharedPointer.h:2066:3: error: invalid application of 'sizeof' to an incomplete type 'FThing'",
			"/Engine/Source/Runtime/Core/Public/Templates/SharedPointer.h:2050:10: note: in instantiation of function template specialization 'MakeShared<FThing>' requested here",
			`${SNIPPET}:7:10: note: in instantiation of function template specialization 'MakeShared<FThing>' requested here`,
			`${SNIPPET}:3:8: note: forward declaration of 'FThing'`,
		].join("\n");

		expect(parseDiagnostics(output, SNIPPET)).toEqual([{ line: 7, column: 10, severity: "error", message: "invalid application of 'sizeof' to an incomplete type 'FThing' (in SharedPointer.h)" }]);
	});

	it("prefers the instantiation note over an earlier forward declaration note", () =>
	{
		const output = [
			"/Engine/Source/Runtime/Core/Public/Templates/TypeCompatibleBytes.h:20:3: error: invalid application of 'alignas' to an incomplete type 'FThing'",
			`${SNIPPET}:2:8: note: forward declaration of 'FThing'`,
			`${SNIPPET}:5:29: note: in instantiation of function template specialization 'MakeShared<FThing>' requested here`,
		].join("\n");

		expect(parseDiagnostics(output, SNIPPET)).toEqual([{ line: 5, column: 29, severity: "error", message: "invalid application of 'alignas' to an incomplete type 'FThing' (in TypeCompatibleBytes.h)" }]);
	});

	it("puts a follow-on header error, which clang prints without the instantiation stack, on the same line as the error before it", () =>
	{
		const output = [
			"/Engine/Templates/TypeCompatibleBytes.h:81:33: error: invalid application of 'sizeof' to an incomplete type 'FThing'",
			"/Engine/Templates/SharedPointer.h:2114:74: note: in instantiation of template class 'TIntrusiveReferenceController<FThing>' requested here",
			`${SNIPPET}:5:29: note: in instantiation of function template specialization 'MakeShared<FThing>' requested here`,
			`${SNIPPET}:2:8: note: forward declaration of 'FThing'`,
			`In file included from ${SNIPPET}:1:`,
			"/Engine/Templates/TypeCompatibleBytes.h:81:2: error: invalid application of 'alignas' to an incomplete type 'FThing'",
			`${SNIPPET}:2:8: note: forward declaration of 'FThing'`,
		].join("\n");

		expect(parseDiagnostics(output, SNIPPET).map((diagnostic) => `${diagnostic.line}:${diagnostic.column}`)).toEqual(["5:29", "5:29"]);
	});

	it("puts an error inside a header the snippet included on the include line, and an unplaceable one on line 1", () =>
	{
		const included = [`In file included from ${SNIPPET}:4:`, "/etc/hosts:1:1: error: expected unqualified-id"].join("\n");
		const unplaced = "/S/Intermediate/pch.gch: fatal error: file '/Engine/Core.h' has been modified since the precompiled header was built";
		const stale = "fatal error: file '/Engine/Core.h' has been modified since the precompiled header '/S/pch.gch' was built";
		const staleWithIncludeLine = `In file included from ${SNIPPET}:1:\n${stale}`;

		expect(parseDiagnostics(included, SNIPPET)).toEqual([{ line: 4, severity: "error", message: "expected unqualified-id (in hosts)" }]);
		expect(parseDiagnostics(unplaced, SNIPPET)).toEqual([]);
		expect(resultOf(1, stale, SNIPPET)).toEqual({ ok: false, diagnostics: [{ line: 1, severity: "error", message: `The compiler failed: ${stale}` }] });
		expect(resultOf(1, staleWithIncludeLine, SNIPPET).diagnostics[0]?.message).toBe(`The compiler failed: ${stale}`);
	});

	it("drops header warnings", () =>
	{
		expect(parseDiagnostics("/Engine/Thing.h:4:2: warning: deprecated\n", SNIPPET)).toEqual([]);
	});
});

describe("resultOf", () =>
{
	it("is ok only on exit code 0 without errors", () =>
	{
		expect(resultOf(0, "", SNIPPET)).toEqual({ ok: true, diagnostics: [] });
		expect(resultOf(0, `${SNIPPET}:2:5: warning: unused variable 'Count'`, SNIPPET).ok).toBe(true);
		expect(resultOf(1, `${SNIPPET}:3:1: error: expected ';'`, SNIPPET)).toEqual({ ok: false, diagnostics: [{ line: 3, column: 1, severity: "error", message: "expected ';'" }] });
	});

	it("fails a non-zero exit with no message about the snippet on line 1, and reports a timeout as its own error", () =>
	{
		expect(resultOf(1, "\nclang: error: unable to execute command: Killed\n", SNIPPET)).toEqual({ ok: false, diagnostics: [{ line: 1, severity: "error", message: "The compiler failed: clang: error: unable to execute command: Killed" }] });
		expect(resultOf(null, "", SNIPPET)).toEqual({ ok: false, diagnostics: [{ line: 1, severity: "error", message: expect.stringMatching(/took longer than 20 seconds/) }] });
	});
});

describe("ClangSnippetSyntaxChecker", () =>
{
	it("runs xcrun clang++ from Engine/Source with this check's own files and removes them afterwards", async () =>
	{
		const commandRunner = new FakeCommandRunner({ ["xcrun clang++ @/S/Intermediate/DojoSnippets/Snippet-one.rsp"]: { exitCode: 1, stderr: `${SNIPPET}:3:1: error: expected ';'` } });
		const { checker, fileSystem } = createChecker(commandRunner);

		const result = await checker.check("/Engines/UE", "/S", "#include \"Lantern.generated.h\"\nint a = 1;\nint b = 2\n");

		expect(result).toEqual({ ok: false, diagnostics: [{ line: 3, column: 1, severity: "error", message: "expected ';'" }] });
		expect(commandRunner.workingFolders).toEqual(["/Engines/UE/Engine/Source"]);
		expect(fileSystem.writes).toEqual(["/S/Intermediate/DojoSnippets/SnippetPrelude-one.h", SNIPPET, "/S/Intermediate/DojoSnippets/Snippet-one.rsp"]);
		expect([...fileSystem.files.keys()].filter((path) => path.includes("DojoSnippets"))).toEqual([]);
	});

	it("gives two checks at the same time their own files, so neither reads the other's snippet", async () =>
	{
		const seen: string[] = [];
		const fileSystem = new FakeSandboxFileSystem({ [DONOR_PATH]: DONOR });
		const slowRunner: CommandRunner = {
			run: async (_command, commandArguments): Promise<CommandResult> =>
			{
				const responseFile = (commandArguments[1] ?? "").slice(1);
				await new Promise((resolve) => setTimeout(resolve, 5));
				const snippetLine = (await fileSystem.readTextFile(responseFile))?.split("\n").at(-2) ?? "";
				seen.push(await fileSystem.readTextFile(snippetLine.slice(1, -1)) ?? "missing");

				return { started: true, exitCode: 0, stdout: "", stderr: "" };
			},
		};
		const { checker } = createChecker(slowRunner, fileSystem);

		await Promise.all([checker.check("/E", "/S", "int first;"), checker.check("/E", "/S", "int second;")]);

		expect(seen.sort()).toEqual(["int first;", "int second;"]);
	});

	it("fails a timed-out check and asks for a build first when the sandbox has no response file", async () =>
	{
		const { checker } = createChecker(new FakeCommandRunner({ ["xcrun clang++ @/S/Intermediate/DojoSnippets/Snippet-one.rsp"]: { exitCode: null } }));
		const { checker: unbuilt } = createChecker(new FakeCommandRunner({}), new FakeSandboxFileSystem());

		expect((await checker.check("/E", "/S", "int x;")).ok).toBe(false);
		await expect(unbuilt.check("/E", "/S", "int x;")).rejects.toMatchObject({ appError: { code: "sandbox-not-ready" } });
	});
});
