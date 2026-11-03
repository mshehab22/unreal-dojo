// Checks the Windows snippet check against cl.exe output recorded on UE 5.8.4 with MSVC 14.50: the response file, the compiler search, parsing, and per-check files (A1310 to A1313).
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { CommandRunner } from "../../src/main/services/unreal/CommandRunner";
import { MsvcCompilerLocator } from "../../src/main/services/unreal/MsvcCompilerLocator";
import { msvcResultOf, MsvcSnippetSyntaxChecker, msvcSnippetResponseFile, parseMsvcDiagnostics } from "../../src/main/services/unreal/MsvcSnippetSyntaxChecker";
import { WindowsPlatformPaths } from "../../src/main/services/unreal/WindowsPlatformPaths";
import { FakeCommandRunner } from "./FakeCommandRunner";
import { FakeSandboxFileSystem } from "./FakeSandboxFileSystem";

/** The sandbox the fixtures were rewritten to. */
const SANDBOX = "C:\\Dojo\\DojoSandbox";

/** The engine the check runs against. */
const ENGINE = "C:\\Program Files\\Epic Games\\UE_5.8";

/** Where UBT keeps the module's response files. */
const MODULE_FOLDER = `${SANDBOX}\\Intermediate\\Build\\Win64\\x64\\UnrealEditor\\Development\\Dojo`;

/** UBT spells its own paths with forward slashes. */
const MODULE_FOLDER_IN_RESPONSE_FILES = "C:/Dojo/DojoSandbox/Intermediate/Build/Win64/x64/UnrealEditor/Development/Dojo";

/** The shared response file the donor names. */
const SHARED_PATH = `${MODULE_FOLDER_IN_RESPONSE_FILES}/Dojo.Shared.rsp`;

/** The precompiled header lines every source in the module shares. */
const PRECOMPILED_HEADER = "C:/Dojo/DojoSandbox/Intermediate/Build/Win64/x64/DojoEditor/Development/UnrealEd/SharedPCH.UnrealEd.Project.ValApi.ValExpApi.Cpp20.h";

/** A per-source response file in UBT 5.8's format, CRLF line ends. */
function donorFor(source: string): string
{
	return [
		`"C:/Dojo/DojoSandbox/${source}"`,
		`@"${SHARED_PATH}"`,
		`/FI"${PRECOMPILED_HEADER}"`,
		`/FI"${MODULE_FOLDER_IN_RESPONSE_FILES}/Definitions.Dojo.h"`,
		`/Yu"${PRECOMPILED_HEADER}"`,
		`/Fp"${PRECOMPILED_HEADER}.pch"`,
		`/Fo"${MODULE_FOLDER_IN_RESPONSE_FILES}/Dojo.cpp.obj"`,
		`/experimental:log "${MODULE_FOLDER_IN_RESPONSE_FILES}/Dojo.cpp.sarif"`,
		`/sourceDependencies "${MODULE_FOLDER_IN_RESPONSE_FILES}/Dojo.cpp.dep.json"`,
		"/nologo",
		"/TP",
		"/GR-",
		"/std:c++20",
		"/wd5054",
	].join("\r\n");
}

/** The MSVC tools folder UBT built with, as the shared response file names it. */
const UBT_TOOLS = "C:/Program Files/Microsoft Visual Studio/18/Community/VC/Tools/MSVC/14.50.35717";

/** A trimmed shared response file with the MSVC and Windows SDK include lines UBT writes. */
const SHARED = ["/X", "/nologo", "/c", "/diagnostics:caret", "/W4", "/I \"Runtime/Core/Public\"", "/external:W0", `/external:I "${UBT_TOOLS}/INCLUDE"`, "/external:I \"C:/Program Files (x86)/Windows Kits/10/include/10.0.22621.0/ucrt\""].join("\r\n");

/** The compiler in that folder, as the checker runs it. */
const UBT_COMPILER = "C:\\Program Files\\Microsoft Visual Studio\\18\\Community\\VC\\Tools\\MSVC\\14.50.35717\\bin\\Hostx64\\x64\\cl.exe";

/** This check's snippet file, with the fixed test id. */
const SNIPPET = `${SANDBOX}\\Intermediate\\DojoSnippets\\Snippet-one.cpp`;

/** This check's prelude header. */
const PRELUDE = `${SANDBOX}\\Intermediate\\DojoSnippets\\SnippetPrelude-one.h`;

/** This check's response file. */
const RESPONSE = `${SANDBOX}\\Intermediate\\DojoSnippets\\Snippet-one.rsp`;

/** The vswhere command line of the fallback search. */
const VSWHERE_QUERY = "C:\\Program Files (x86)\\Microsoft Visual Studio\\Installer\\vswhere.exe -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath -utf8";

/** The Visual Studio install vswhere answers. */
const INSTALL = "C:\\Program Files\\Microsoft Visual Studio\\18\\Community";

/** The compiler of that install's default MSVC version. */
const DEFAULT_COMPILER = `${INSTALL}\\VC\\Tools\\MSVC\\14.51.36231\\bin\\Hostx64\\x64\\cl.exe`;

/** One recorded cl.exe output (stdout), the scratch path rewritten to the sandbox's. */
function fixture(name: string): string
{
	return readFileSync(join(__dirname, "fixtures", "msvc-snippets", `${name}.txt`), "utf8");
}

/** A built sandbox with the donor, its shared response file, and the compiler UBT used. */
function builtSandbox(extraFiles: Record<string, string> = {}): FakeSandboxFileSystem
{
	return new FakeSandboxFileSystem({ [`${MODULE_FOLDER}\\Dojo.cpp.obj.rsp`]: donorFor("Source/Dojo/Dojo.cpp"), [SHARED_PATH]: SHARED, [UBT_COMPILER]: "", ...extraFiles });
}

/** A checker over fakes whose checks are named one, two, three... */
function createChecker(commandRunner: CommandRunner, fileSystem: FakeSandboxFileSystem = builtSandbox())
{
	const ids = ["one", "two", "three"];
	const checker = new MsvcSnippetSyntaxChecker(new WindowsPlatformPaths({ programFiles: undefined, programData: undefined }), fileSystem, commandRunner, new MsvcCompilerLocator(commandRunner, fileSystem, undefined), () => ids.shift() ?? "later");

	return { checker, fileSystem };
}

describe("msvcSnippetResponseFile", () =>
{
	it("keeps the shared response file, forced includes, and precompiled header, drops the source and the files it writes, then adds the prelude, /Zs, and the snippet", () =>
	{
		expect(msvcSnippetResponseFile(donorFor("Source/Dojo/Dojo.cpp"), PRELUDE, SNIPPET).split("\n")).toEqual([
			`@"${SHARED_PATH}"`,
			`/FI"${PRECOMPILED_HEADER}"`,
			`/FI"${MODULE_FOLDER_IN_RESPONSE_FILES}/Definitions.Dojo.h"`,
			`/Yu"${PRECOMPILED_HEADER}"`,
			`/Fp"${PRECOMPILED_HEADER}.pch"`,
			"/nologo",
			"/TP",
			"/GR-",
			"/std:c++20",
			"/wd5054",
			`/FI"${PRELUDE}"`,
			"/Zs",
			`"${SNIPPET}"`,
			"",
		]);
	});
});

describe("parseMsvcDiagnostics and msvcResultOf on recorded cl output", () =>
{
	it("passes a clean reflected class (cl prints only the file name)", () =>
	{
		expect(msvcResultOf(0, fixture("clean"), SNIPPET)).toEqual({ ok: true, diagnostics: [] });
	});

	it("reports a snippet error on its line and column, the code after the message", () =>
	{
		expect(msvcResultOf(2, fixture("undeclared"), SNIPPET)).toEqual({ ok: false, diagnostics: [{ line: 5, column: 16, severity: "error", message: "'DeltaSecs': undeclared identifier [C2065]" }] });
	});

	it("puts the template error from an engine header on the snippet line that instantiated MakeShared, not on the forward declaration, once although cl repeats it", () =>
	{
		expect(parseMsvcDiagnostics(fixture("header"), SNIPPET)).toEqual([{ line: 7, column: 31, severity: "error", message: "use of undefined type 'FThing' [C2027] (in TypeCompatibleBytes.h)" }]);
	});

	it("reports a missing include as an error on its line", () =>
	{
		expect(parseMsvcDiagnostics(fixture("missing"), SNIPPET)).toEqual([{ line: 2, column: 1, severity: "error", message: "Cannot open include file: 'DoesNotExist.h': No such file or directory [C1083]" }]);
	});

	it("keeps warnings as warnings and warnings UBT makes errors as errors, in line order", () =>
	{
		expect(msvcResultOf(2, fixture("warning"), SNIPPET)).toEqual({
			ok: false,
			diagnostics: [
				{ line: 5, column: 8, severity: "error", message: "'Unused': unreferenced local variable [C4101]" },
				{ line: 6, column: 12, severity: "warning", message: "'initializing': truncation from '__int64' to 'int32' [C4305]" },
				{ line: 6, column: 14, severity: "error", message: "'initializing': truncation of constant value [C4309]" },
			],
		});
	});

	it("reports a parameter that hides an actor member (C4458, which clang does not catch) and ignores the engine's declaration notes", () =>
	{
		expect(parseMsvcDiagnostics(fixture("shadow"), SNIPPET).map((diagnostic) => `${diagnostic.line}:${diagnostic.column} ${diagnostic.message}`)).toEqual([
			"6:18 declaration of 'Tags' hides class member [C4458]",
			"7:21 declaration of 'Owner' hides class member [C4458]",
		]);
	});

	it("reads a line-only location without a column", () =>
	{
		expect(parseMsvcDiagnostics(`${SNIPPET}(3): error C2143: syntax error: missing ';' before '}'`, SNIPPET)).toEqual([{ line: 3, severity: "error", message: "syntax error: missing ';' before '}' [C2143]" }]);
	});

	it("fails on line 1 with cl's own line when the failure names no file, and on a timeout", () =>
	{
		const commandLineError = "cl : Command line error D8022 : cannot open 'C:\\Dojo\\x.rsp'";

		expect(msvcResultOf(2, `Snippet-one.cpp\n\n${commandLineError}`, SNIPPET)).toEqual({ ok: false, diagnostics: [{ line: 1, severity: "error", message: `The compiler failed: ${commandLineError}` }] });
		expect(msvcResultOf(null, "", SNIPPET).diagnostics[0]?.message).toMatch(/took longer than 20 seconds/);
	});

	it("explains a precompiled header this compiler cannot read instead of quoting C1853", () =>
	{
		const output = `${SNIPPET}(1,1): fatal error C1853: 'C:\\Dojo\\x.pch' precompiled header file is from a different version of the compiler, or the precompiled header is C++ and you are using it from C (or vice versa)`;

		expect(msvcResultOf(2, output, SNIPPET)).toEqual({ ok: false, diagnostics: [{ line: 1, severity: "error", message: expect.stringMatching(/Rebuild the sandbox in Settings/) }] });
	});

	it("gives the same rebuild message for a damaged (C1852) or missing precompiled header", () =>
	{
		const damaged = `${SNIPPET}(1,1): fatal error C1852: 'C:\\Dojo\\x.pch' is not a valid precompiled header file`;
		const missing = `${SNIPPET}(1,1): fatal error C1083: Cannot open precompiled header file: 'C:\\Dojo\\x.pch': No such file or directory`;

		for (const output of [damaged, missing]) expect(msvcResultOf(2, output, SNIPPET).diagnostics).toEqual([{ line: 1, severity: "error", message: expect.stringMatching(/Rebuild the sandbox in Settings/) }]);
	});
});

describe("MsvcSnippetSyntaxChecker", () =>
{
	it("runs the compiler UBT used from Engine/Source on its own files, answers from stdout, and removes the files", async () =>
	{
		const runner = new FakeCommandRunner({ [`${UBT_COMPILER} @${RESPONSE}`]: { exitCode: 2, stdout: fixture("undeclared") } });
		const { checker, fileSystem } = createChecker(runner);

		const result = await checker.check(ENGINE, SANDBOX, "#include \"Lantern.generated.h\"\nvoid Tick()\n{\n\tSuper::Tick();\n}");

		expect(result.diagnostics).toEqual([{ line: 5, column: 16, severity: "error", message: "'DeltaSecs': undeclared identifier [C2065]" }]);
		expect(runner.commandLines).toEqual([`${UBT_COMPILER} @${RESPONSE}`]);
		expect(runner.workingFolders).toEqual([`${ENGINE}\\Engine\\Source`]);
		expect(fileSystem.writes).toEqual([PRELUDE, SNIPPET, RESPONSE]);
		expect([...fileSystem.files.keys()].filter((filePath) => filePath.includes("DojoSnippets"))).toEqual([]);
	});

	it("writes the snippet with generated.h and Super:: blanked, and the prelude as the last forced include", async () =>
	{
		const seen: Record<string, string> = {};
		const fileSystem = builtSandbox();
		const runner: CommandRunner = { run: async () =>
		{
			seen.snippet = fileSystem.files.get(SNIPPET) ?? "";
			seen.response = fileSystem.files.get(RESPONSE) ?? "";

			return { started: true, exitCode: 0, stdout: fixture("clean"), stderr: "" };
		} };

		expect(await createChecker(runner, fileSystem).checker.check(ENGINE, SANDBOX, "#include \"Lantern.generated.h\"\nSuper::Tick();")).toEqual({ ok: true, diagnostics: [] });
		expect(seen.snippet).toBe("\n       Tick();");
		expect(seen.response?.split("\n").slice(-4)).toEqual([`/FI"${PRELUDE}"`, "/Zs", `"${SNIPPET}"`, ""]);
	});

	it("uses a unity file's response file when the module source has none", async () =>
	{
		const fileSystem = new FakeSandboxFileSystem({ [`${MODULE_FOLDER}\\Module.Dojo.1.cpp.obj.rsp`]: donorFor("Intermediate/Module.Dojo.1.cpp"), [`${MODULE_FOLDER}\\Dojo.Shared.rsp.old`]: "", [SHARED_PATH]: SHARED, [UBT_COMPILER]: "" });
		const runner = new FakeCommandRunner({ [`${UBT_COMPILER} @${RESPONSE}`]: { stdout: fixture("clean") } });

		expect(await createChecker(runner, fileSystem).checker.check(ENGINE, SANDBOX, "int32 Count = 0;")).toEqual({ ok: true, diagnostics: [] });
	});

	it("skips a response file that names no shared response file and uses the next one", async () =>
	{
		const fileSystem = builtSandbox({ [`${MODULE_FOLDER}\\Dojo.cpp.obj.rsp`]: "\"C:/Dojo/DojoSandbox/Source/Dojo/Dojo.cpp\"\r\n/nologo", [`${MODULE_FOLDER}\\Module.Dojo.1.cpp.obj.rsp`]: donorFor("Intermediate/Module.Dojo.1.cpp") });
		const seen: string[] = [];
		const runner: CommandRunner = { run: async () =>
		{
			seen.push(fileSystem.files.get(RESPONSE) ?? "");

			return { started: true, exitCode: 0, stdout: fixture("clean"), stderr: "" };
		} };

		await createChecker(runner, fileSystem).checker.check(ENGINE, SANDBOX, "int32 Count = 0;");

		expect(seen[0]?.split("\n")[0]).toBe(`@"${SHARED_PATH}"`);
	});

	it("reports cl's command line error from stderr when stdout is empty", async () =>
	{
		const stderr = "cl : Command line error D8022 : cannot open 'C:\\Dojo\\DojoSandbox\\Intermediate\\DojoSnippets\\Snippet-one.rsp'";
		const runner = new FakeCommandRunner({ [`${UBT_COMPILER} @${RESPONSE}`]: { exitCode: 2, stdout: "", stderr } });

		expect(await createChecker(runner).checker.check(ENGINE, SANDBOX, "x")).toEqual({ ok: false, diagnostics: [{ line: 1, severity: "error", message: `The compiler failed: ${stderr}` }] });
	});

	it("answers sandbox-not-ready before the first build, without running anything", async () =>
	{
		const runner = new FakeCommandRunner({});

		await expect(createChecker(runner, new FakeSandboxFileSystem()).checker.check(ENGINE, SANDBOX, "x")).rejects.toMatchObject({ appError: { code: "sandbox-not-ready", message: "The syntax check needs the sandbox to be built once." } });
		expect(runner.commandLines).toEqual([]);
	});

	it("answers toolchain-missing when no compiler is found, and when the compiler cannot start", async () =>
	{
		const noCompiler = new FakeSandboxFileSystem({ [`${MODULE_FOLDER}\\Dojo.cpp.obj.rsp`]: donorFor("Source/Dojo/Dojo.cpp"), [SHARED_PATH]: SHARED });

		await expect(createChecker(new FakeCommandRunner({}), noCompiler).checker.check(ENGINE, SANDBOX, "x")).rejects.toMatchObject({ appError: { code: "toolchain-missing", message: "The Visual Studio C++ compiler was not found for the syntax check." } });
		await expect(createChecker(new FakeCommandRunner({})).checker.check(ENGINE, SANDBOX, "x")).rejects.toMatchObject({ appError: { code: "toolchain-missing", message: "The C++ compiler could not be started for the syntax check." } });
	});
});

describe("MsvcCompilerLocator", () =>
{
	it("picks the compiler UBT built with, without asking vswhere", async () =>
	{
		const runner = new FakeCommandRunner({});

		expect(await new MsvcCompilerLocator(runner, builtSandbox(), undefined).find(SHARED)).toBe(UBT_COMPILER);
		expect(runner.commandLines).toEqual([]);
	});

	it("also reads an MSVC folder from a plain /I line written with backslashes", async () =>
	{
		const backslashLine = "/I \"C:\\Program Files\\Microsoft Visual Studio\\18\\Community\\VC\\Tools\\MSVC\\14.50.35717\\include\"";

		expect(await new MsvcCompilerLocator(new FakeCommandRunner({}), builtSandbox(), undefined).find(`/nologo\r\n${backslashLine}\r\n`)).toBe(UBT_COMPILER);
	});

	it("falls back to the newest Visual Studio's default tools when UBT's folder is gone", async () =>
	{
		const runner = new FakeCommandRunner({ [VSWHERE_QUERY]: { stdout: `${INSTALL}\r\n` } });
		const fileSystem = new FakeSandboxFileSystem({ [`${INSTALL}\\VC\\Auxiliary\\Build\\Microsoft.VCToolsVersion.default.txt`]: "14.51.36231\r\n", [DEFAULT_COMPILER]: "" });

		expect(await new MsvcCompilerLocator(runner, fileSystem, undefined).find(SHARED)).toBe(DEFAULT_COMPILER);
	});

	it("answers null when vswhere is missing, finds nothing, or the default version has no compiler", async () =>
	{
		const versionFile = { [`${INSTALL}\\VC\\Auxiliary\\Build\\Microsoft.VCToolsVersion.default.txt`]: "14.51.36231" };

		expect(await new MsvcCompilerLocator(new FakeCommandRunner({}), new FakeSandboxFileSystem(), undefined).find(SHARED)).toBeNull();
		expect(await new MsvcCompilerLocator(new FakeCommandRunner({ [VSWHERE_QUERY]: { stdout: "" } }), new FakeSandboxFileSystem(), undefined).find(SHARED)).toBeNull();
		expect(await new MsvcCompilerLocator(new FakeCommandRunner({ [VSWHERE_QUERY]: { stdout: INSTALL } }), new FakeSandboxFileSystem(versionFile), undefined).find(SHARED)).toBeNull();
	});
});
