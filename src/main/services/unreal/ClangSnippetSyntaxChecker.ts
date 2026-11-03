// The macOS snippet check: UBT's own clang response file for a sandbox source, with the source swapped for the snippet and `-fsyntax-only` added.
import { randomUUID } from "node:crypto";

import type { SyntaxCheckResult, SyntaxDiagnostic } from "@shared/types/run";

import { AppErrorException } from "../../errors/AppErrorException";
import type { CommandRunner } from "./CommandRunner";
import type { PlatformPaths } from "./PlatformPaths";
import type { SandboxFileSystem } from "./SandboxFileSystem";
import { type CompilerDiagnostic, type CompilerDialect, parseSnippetDiagnostics, snippetCheckResult } from "./snippetDiagnostics";
import { prepareSnippet, SNIPPET_PRELUDE } from "./snippetSource";
import type { SnippetSyntaxChecker } from "./SnippetSyntaxChecker";

/** A sandbox source that always exists; its response file carries the module's flags, include paths, and shared precompiled header. */
const DONOR_SOURCE = "DojoTestActor.cpp";

/** Architectures UBT may have built the sandbox for, Apple silicon first. */
const ARCHITECTURES = ["arm64", "x86_64"];

/** Response file lines dropped from the donor: compile-to-object, dependency output, colors, and warnings as errors. */
const DROPPED_FLAGS = ["-c", "-fdiagnostics-color", "-Werror"];

/** `file:line:column: severity: message` as clang prints it. */
const DIAGNOSTIC = /^(.*):(\d+):(\d+): (fatal error|error|warning|note): (.*)$/;

/** `In file included from <file>:<line>:` and its continuation lines, which say which snippet line pulled a header in. */
const INCLUDED_FROM = /^\s*(?:In file included )?from (.*):(\d+):$/;

/** How clang prints diagnostics: an instantiation note ends with "requested here". */
const CLANG_DIALECT: CompilerDialect = {
	diagnostic: (line) =>
	{
		const match = DIAGNOSTIC.exec(line);
		if (!match) return null;

		const [, file = "", lineText = "1", columnText = "1", severity = "error", message = ""] = match;

		return { file, line: Number(lineText), column: Number(columnText), severity: severity as CompilerDiagnostic["severity"], message };
	},
	includedFrom: (line) =>
	{
		const match = INCLUDED_FROM.exec(line);

		return match ? { file: match[1] ?? "", line: Number(match[2]) } : null;
	},
	isInstantiationNote: (message) => message.includes("requested here"),
};

/** SnippetSyntaxChecker for macOS (clang through `xcrun`). Runs in about half a second once the sandbox is built. */
export class ClangSnippetSyntaxChecker implements SnippetSyntaxChecker
{
	private readonly paths: PlatformPaths;
	private readonly fileSystem: SandboxFileSystem;
	private readonly commandRunner: CommandRunner;
	private readonly makeCheckId: () => string;

	/** Takes the platform's paths, the file system, the command runner, and (for tests) the id each check's files are named with. */
	constructor(paths: PlatformPaths, fileSystem: SandboxFileSystem, commandRunner: CommandRunner, makeCheckId: () => string = () => randomUUID())
	{
		this.paths = paths;
		this.fileSystem = fileSystem;
		this.commandRunner = commandRunner;
		this.makeCheckId = makeCheckId;
	}

	/** Writes this check's own snippet, prelude, and response file under `Intermediate/DojoSnippets` (named per check, so two quick checks cannot race, A410), runs clang from `Engine/Source` (the response file's include paths are relative to it), parses the diagnostics, and removes the files. */
	async check(engineRoot: string, sandboxFolder: string, code: string): Promise<SyntaxCheckResult>
	{
		const paths = this.paths;
		const donor = await this.readDonorResponseFile(sandboxFolder);
		const checkId = this.makeCheckId();
		const snippetFolder = paths.join(sandboxFolder, "Intermediate", "DojoSnippets");
		const snippetFile = paths.join(snippetFolder, `Snippet-${checkId}.cpp`);
		const preludeFile = paths.join(snippetFolder, `SnippetPrelude-${checkId}.h`);
		const responseFile = paths.join(snippetFolder, `Snippet-${checkId}.rsp`);

		try
		{
			await this.fileSystem.writeTextFile(preludeFile, SNIPPET_PRELUDE);
			await this.fileSystem.writeTextFile(snippetFile, prepareSnippet(code));
			await this.fileSystem.writeTextFile(responseFile, snippetResponseFile(donor, preludeFile, snippetFile));

			const result = await this.commandRunner.run("xcrun", ["clang++", `@${responseFile}`], paths.join(engineRoot, "Engine", "Source"));
			if (!result.started) throw new AppErrorException("toolchain-missing", "The C++ compiler could not be started for the syntax check.", "Check that Xcode is installed and selected, then try again.", result.stderr);

			return resultOf(result.exitCode, result.stderr, snippetFile);
		}
		finally
		{
			for (const file of [snippetFile, preludeFile, responseFile]) await this.fileSystem.removeFile(file);
		}
	}

	/** The donor's response file text. Throws `sandbox-not-ready` before the first build. */
	private async readDonorResponseFile(sandboxFolder: string): Promise<string>
	{
		for (const architecture of ARCHITECTURES)
		{
			const responseFile = this.paths.join(sandboxFolder, "Intermediate", "Build", "Mac", architecture, "UnrealEditor", "Development", "Dojo", `${DONOR_SOURCE}.o.rsp`);
			const text = await this.fileSystem.readTextFile(responseFile);

			if (text !== null) return text;
		}

		throw new AppErrorException("sandbox-not-ready", "The syntax check needs the sandbox to be built once.", "Run any build quest, or rebuild the sandbox in Settings, then check again.", sandboxFolder);
	}
}

/** The donor's lines without the object output, dependency output, the donor source, colors, and -Werror; then the prelude, `-fsyntax-only`, and the snippet. */
export function snippetResponseFile(donor: string, preludeFile: string, snippetFile: string): string
{
	const kept = donor.split(/\r?\n/).filter((line) =>
	{
		const flag = line.trim();

		if (flag === "" || DROPPED_FLAGS.includes(flag)) return false;

		return !flag.startsWith("-MD") && !flag.startsWith("-o ") && !flag.endsWith(`${DONOR_SOURCE}"`);
	});

	// A scratch buffer is often a header, so `#pragma once` in it is fine; a blanked `Super::BeginPlay()` reads as a call to itself.
	return [...kept, `-include "${preludeFile}"`, "-fsyntax-only", "-fno-color-diagnostics", "-Wno-pragma-once-outside-header", "-Wno-infinite-recursion", `"${snippetFile}"`, ""].join("\n");
}

/** The check's answer from clang's exit code and output (A411). */
export function resultOf(exitCode: number | null, compilerOutput: string, snippetFile: string): SyntaxCheckResult
{
	return snippetCheckResult(exitCode, compilerOutput, snippetFile, CLANG_DIALECT);
}

/** The snippet's errors and warnings in line order, header errors placed on the snippet line that caused them (A411). */
export function parseDiagnostics(compilerOutput: string, snippetFile: string): SyntaxDiagnostic[]
{
	return parseSnippetDiagnostics(compilerOutput, snippetFile, CLANG_DIALECT);
}
