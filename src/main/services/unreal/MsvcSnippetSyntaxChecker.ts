// The Windows snippet check: UBT's own MSVC response file for a sandbox source, with the source swapped for the snippet and `/Zs` added (A1310).
import { randomUUID } from "node:crypto";

import type { SyntaxCheckResult, SyntaxDiagnostic } from "@shared/types/run";

import { AppErrorException } from "../../errors/AppErrorException";
import type { CommandRunner } from "./CommandRunner";
import type { MsvcCompilerLocator } from "./MsvcCompilerLocator";
import type { PlatformPaths } from "./PlatformPaths";
import type { SandboxFileSystem } from "./SandboxFileSystem";
import { type CompilerDiagnostic, type CompilerDialect, parseSnippetDiagnostics, snippetCheckResult } from "./snippetDiagnostics";
import { prepareSnippet, SNIPPET_PRELUDE } from "./snippetSource";
import type { SnippetSyntaxChecker } from "./SnippetSyntaxChecker";

/** Where UBT keeps the Dojo module's response files, under the sandbox. */
const MODULE_FOLDER = ["Intermediate", "Build", "Win64", "x64", "UnrealEditor", "Development", "Dojo"];

/** Per-source response files end like this; any of them carries the module's shared flags and precompiled header. */
const SOURCE_RESPONSE_SUFFIX = ".cpp.obj.rsp";

/** The module's own source is compiled on its own, so its response file is tried first; unity builds fold the other sources into `Module.Dojo.N.cpp`. */
const PREFERRED_DONOR = "Dojo.cpp.obj.rsp";

/** Donor lines dropped because they write files: the object, the SARIF log, and the dependency list. */
const DROPPED_PREFIXES = ["/Fo", "/experimental:log", "/sourceDependencies"];

/** A line that is only a quoted path: the donor's source file. */
const SOURCE_LINE = /^"[^"]*"$/;

/** The `@"...Dojo.Shared.rsp"` line naming the module's shared response file. */
const SHARED_RESPONSE_LINE = /^@"([^"]+)"$/;

/** `file(line[,column]): severity [code]: message` as cl prints it with `/FC`. */
const DIAGNOSTIC = /^(.+?)\((\d+)(?:,(\d+))?\)\s?: (fatal error|error|warning|note)(?: ([A-Z]+\d+))?\s?: (.*)$/;

/** The precompiled header cannot be used: made by another compiler version (C1853), damaged (C1852), or gone. */
const PRECOMPILED_HEADER_UNUSABLE = /\b(?:C1853|C1852)\b|C1083: Cannot open precompiled header file/;

/** How cl prints diagnostics: the error code goes after the message, as clang's warning flags do (A1312). */
const MSVC_DIALECT: CompilerDialect = {
	diagnostic: (line) =>
	{
		const match = DIAGNOSTIC.exec(line);
		if (!match) return null;

		const [, file = "", lineText = "1", columnText, severity = "error", code, message = ""] = match;

		return { file, line: Number(lineText), ...(columnText === undefined ? {} : { column: Number(columnText) }), severity: severity as CompilerDiagnostic["severity"], message: code ? `${message} [${code}]` : message };
	},
	includedFrom: () => null,
	isInstantiationNote: (message) => /^see reference to .*instantiation|^while compiling/.test(message),
};

/** SnippetSyntaxChecker for Windows (cl.exe with `/Zs` and the sandbox's precompiled header). Runs in one to three seconds once the sandbox is built. */
export class MsvcSnippetSyntaxChecker implements SnippetSyntaxChecker
{
	private readonly paths: PlatformPaths;
	private readonly fileSystem: SandboxFileSystem;
	private readonly commandRunner: CommandRunner;
	private readonly compilerLocator: MsvcCompilerLocator;
	private readonly makeCheckId: () => string;

	/** Takes the platform's paths, the file system, the command runner, the compiler search, and (for tests) the id each check's files are named with. */
	constructor(paths: PlatformPaths, fileSystem: SandboxFileSystem, commandRunner: CommandRunner, compilerLocator: MsvcCompilerLocator, makeCheckId: () => string = () => randomUUID())
	{
		this.paths = paths;
		this.fileSystem = fileSystem;
		this.commandRunner = commandRunner;
		this.compilerLocator = compilerLocator;
		this.makeCheckId = makeCheckId;
	}

	/** Writes this check's own snippet, prelude, and response file under `Intermediate/DojoSnippets` (A410), runs cl from `Engine/Source` (the response file's include paths are relative to it), parses the diagnostics, and removes the files. */
	async check(engineRoot: string, sandboxFolder: string, code: string): Promise<SyntaxCheckResult>
	{
		const paths = this.paths;
		const responseFiles = await this.readResponseFiles(sandboxFolder);
		const compiler = await this.compilerLocator.find(responseFiles.shared);

		if (compiler === null) throw new AppErrorException("toolchain-missing", "The Visual Studio C++ compiler was not found for the syntax check.", "Open the Visual Studio Installer, choose Modify, make sure \"Game development with C++\" is ticked, then rebuild the sandbox in Settings.", "No cl.exe in the MSVC folder the sandbox was built with, and none from vswhere");

		const checkId = this.makeCheckId();
		const snippetFolder = paths.join(sandboxFolder, "Intermediate", "DojoSnippets");
		const snippetFile = paths.join(snippetFolder, `Snippet-${checkId}.cpp`);
		const preludeFile = paths.join(snippetFolder, `SnippetPrelude-${checkId}.h`);
		const responseFile = paths.join(snippetFolder, `Snippet-${checkId}.rsp`);

		try
		{
			await this.fileSystem.writeTextFile(preludeFile, SNIPPET_PRELUDE);
			await this.fileSystem.writeTextFile(snippetFile, prepareSnippet(code));
			await this.fileSystem.writeTextFile(responseFile, msvcSnippetResponseFile(responseFiles.donor, preludeFile, snippetFile));

			const result = await this.commandRunner.run(compiler, [`@${responseFile}`], paths.join(engineRoot, "Engine", "Source"));
			if (!result.started) throw new AppErrorException("toolchain-missing", "The C++ compiler could not be started for the syntax check.", "Open the Visual Studio Installer and repair or update it, then try again.", `${compiler}: ${result.stderr}`);

			// cl prints diagnostics on stdout and command line errors on stderr.
			return msvcResultOf(result.exitCode, `${result.stdout}\n${result.stderr}`, snippetFile);
		}
		finally
		{
			for (const file of [snippetFile, preludeFile, responseFile]) await this.fileSystem.removeFile(file);
		}
	}

	/** A source's response file and the shared one it names. Throws `sandbox-not-ready` before the first build. */
	private async readResponseFiles(sandboxFolder: string): Promise<{ donor: string; shared: string }>
	{
		const moduleFolder = this.paths.join(sandboxFolder, ...MODULE_FOLDER);
		const names = (await this.fileSystem.listFiles(moduleFolder)).filter((name) => name.endsWith(SOURCE_RESPONSE_SUFFIX)).sort();
		const ordered = [...names.filter((name) => name === PREFERRED_DONOR), ...names.filter((name) => name !== PREFERRED_DONOR)];

		for (const name of ordered)
		{
			const donor = await this.fileSystem.readTextFile(this.paths.join(moduleFolder, name));
			const sharedPath = donor?.split(/\r?\n/).map((line) => SHARED_RESPONSE_LINE.exec(line.trim())?.[1]).find((path) => path !== undefined);
			const shared = sharedPath ? await this.fileSystem.readTextFile(sharedPath) : null;

			if (donor && shared !== null) return { donor, shared };
		}

		throw new AppErrorException("sandbox-not-ready", "The syntax check needs the sandbox to be built once.", "Run any build quest, or rebuild the sandbox in Settings, then check again.", moduleFolder);
	}
}

/** The donor's lines without its source and the files it writes; then the prelude, `/Zs`, and the snippet. The shared response file, the forced includes, and the precompiled header stay. */
export function msvcSnippetResponseFile(donor: string, preludeFile: string, snippetFile: string): string
{
	const kept = donor.split(/\r?\n/).map((line) => line.trim()).filter((flag) => flag !== "" && !SOURCE_LINE.test(flag) && !DROPPED_PREFIXES.some((prefix) => flag.startsWith(prefix)));

	return [...kept, `/FI"${preludeFile}"`, "/Zs", `"${snippetFile}"`, ""].join("\n");
}

/** The check's answer from cl's exit code and output (A411); a precompiled header this compiler cannot read gets its own plain message (A1313). */
export function msvcResultOf(exitCode: number | null, compilerOutput: string, snippetFile: string): SyntaxCheckResult
{
	if (exitCode !== 0 && exitCode !== null && PRECOMPILED_HEADER_UNUSABLE.test(compilerOutput))
	{
		return { ok: false, diagnostics: [{ line: 1, severity: "error", message: "The syntax check cannot use the sandbox's last build: it was made by another Visual Studio compiler version, or its files are missing. Rebuild the sandbox in Settings, then check again." }] };
	}

	return snippetCheckResult(exitCode, compilerOutput, snippetFile, MSVC_DIALECT);
}

/** The snippet's errors and warnings in line order, header errors placed on the snippet line that instantiated them. */
export function parseMsvcDiagnostics(compilerOutput: string, snippetFile: string): SyntaxDiagnostic[]
{
	return parseSnippetDiagnostics(compilerOutput, snippetFile, MSVC_DIALECT);
}
