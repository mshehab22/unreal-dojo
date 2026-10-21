// The macOS snippet check: UBT's own clang response file for a sandbox source, with the source swapped for the snippet and `-fsyntax-only` added.
import type { SyntaxCheckResult, SyntaxDiagnostic } from "@shared/types/run";

import { AppErrorException } from "../../errors/AppErrorException";
import type { CommandRunner } from "./CommandRunner";
import type { PlatformPaths } from "./PlatformPaths";
import type { SandboxFileSystem } from "./SandboxFileSystem";
import type { SnippetSyntaxChecker } from "./SnippetSyntaxChecker";

/** A sandbox source that always exists; its response file carries the module's flags, include paths, and shared precompiled header. */
const DONOR_SOURCE = "DojoTestActor.cpp";

/** Architectures UBT may have built the sandbox for, Apple silicon first. */
const ARCHITECTURES = ["arm64", "x86_64"];

/** Response file lines dropped from the donor: compile-to-object, dependency output, colors, and warnings as errors. */
const DROPPED_FLAGS = ["-c", "-fdiagnostics-color", "-Werror"];

/** Blanks the reflection macros, whose real expansion needs code UHT generates; UPROPERTY and UFUNCTION are already empty outside UHT. */
const PRELUDE = [
	"// Unreal Dojo snippet check: reflection macros expand to nothing because UHT does not run on a snippet.",
	"#undef UCLASS",
	"#undef UINTERFACE",
	"#undef GENERATED_BODY",
	"#undef GENERATED_BODY_LEGACY",
	"#undef GENERATED_UCLASS_BODY",
	"#undef GENERATED_USTRUCT_BODY",
	"#undef GENERATED_UINTERFACE_BODY",
	"#undef GENERATED_IINTERFACE_BODY",
	"#define UCLASS(...)",
	"#define UINTERFACE(...)",
	"#define GENERATED_BODY(...)",
	"#define GENERATED_BODY_LEGACY(...)",
	"#define GENERATED_UCLASS_BODY(...)",
	"#define GENERATED_USTRUCT_BODY(...)",
	"#define GENERATED_UINTERFACE_BODY(...)",
	"#define GENERATED_IINTERFACE_BODY(...)",
	"",
].join("\n");

/** `file:line:column: severity: message` as clang prints it. */
const DIAGNOSTIC = /^(.*):(\d+):(\d+): (fatal error|error|warning): (.*)$/;

/** Messages caused by skipping UHT, not by the learner: names GENERATED_BODY would have declared. */
const UHT_ARTIFACTS = [/'Super'/, /'ThisClass'/, /StaticClass/, /\.generated\.h/];

/** An `#include "X.generated.h"` line, blanked so line numbers stay the same. */
const GENERATED_INCLUDE = /^\s*#\s*include\s+"[^"]*\.generated\.h"\s*$/gm;

/** `Super::` calls. Without GENERATED_BODY, `Super` would fall through to the base class's own `Super` (`UObject` for an actor) and report a false error, so it is blanked with as many spaces, keeping columns; a typo in the called name is still caught. */
const SUPER_CALL = /\bSuper::/g;

/** SnippetSyntaxChecker for macOS (clang through `xcrun`). Runs in about half a second once the sandbox is built. */
export class ClangSnippetSyntaxChecker implements SnippetSyntaxChecker
{
	private readonly paths: PlatformPaths;
	private readonly fileSystem: SandboxFileSystem;
	private readonly commandRunner: CommandRunner;

	/** Takes the platform's paths, the file system, and the command runner. */
	constructor(paths: PlatformPaths, fileSystem: SandboxFileSystem, commandRunner: CommandRunner)
	{
		this.paths = paths;
		this.fileSystem = fileSystem;
		this.commandRunner = commandRunner;
	}

	/** Writes the snippet, prelude, and response file under `Intermediate/DojoSnippets`, runs clang from `Engine/Source` (the response file's include paths are relative to it), and parses the snippet's diagnostics. */
	async check(engineRoot: string, sandboxFolder: string, code: string): Promise<SyntaxCheckResult>
	{
		const paths = this.paths;
		const donor = await this.readDonorResponseFile(sandboxFolder);
		const snippetFolder = paths.join(sandboxFolder, "Intermediate", "DojoSnippets");
		const snippetFile = paths.join(snippetFolder, "Snippet.cpp");
		const preludeFile = paths.join(snippetFolder, "SnippetPrelude.h");
		const responseFile = paths.join(snippetFolder, "Snippet.rsp");

		await this.fileSystem.writeTextFile(preludeFile, PRELUDE);
		await this.fileSystem.writeTextFile(snippetFile, prepareSnippet(code));
		await this.fileSystem.writeTextFile(responseFile, snippetResponseFile(donor, preludeFile, snippetFile));

		const result = await this.commandRunner.run("xcrun", ["clang++", `@${responseFile}`], paths.join(engineRoot, "Engine", "Source"));
		if (!result.started) throw new AppErrorException("toolchain-missing", "The C++ compiler could not be started for the syntax check.", "Check that Xcode is installed and selected, then try again.", result.stderr);

		const diagnostics = parseDiagnostics(result.stderr, snippetFile);

		return { ok: !diagnostics.some((diagnostic) => diagnostic.severity === "error"), diagnostics };
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

/** The snippet as compiled: generated.h includes and `Super::` blanked, every line and column where the learner wrote it. */
export function prepareSnippet(code: string): string
{
	return code.replace(GENERATED_INCLUDE, "").replace(SUPER_CALL, (match) => " ".repeat(match.length));
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

/** The snippet's own errors and warnings in line order, without the ones skipping UHT causes. */
export function parseDiagnostics(compilerOutput: string, snippetFile: string): SyntaxDiagnostic[]
{
	const diagnostics: SyntaxDiagnostic[] = [];

	for (const line of compilerOutput.split(/\r?\n/))
	{
		const match = DIAGNOSTIC.exec(line);
		if (!match || !match[1]?.endsWith(snippetFile.slice(snippetFile.lastIndexOf("/")))) continue;

		const message = match[5] ?? "";
		if (UHT_ARTIFACTS.some((pattern) => pattern.test(message))) continue;

		diagnostics.push({ line: Number(match[2]), column: Number(match[3]), severity: match[4] === "warning" ? "warning" : "error", message });
	}

	return diagnostics.sort((left, right) => left.line - right.line || (left.column ?? 0) - (right.column ?? 0));
}
