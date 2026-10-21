// The macOS snippet check: UBT's own clang response file for a sandbox source, with the source swapped for the snippet and `-fsyntax-only` added.
import { randomUUID } from "node:crypto";

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
const DIAGNOSTIC = /^(.*):(\d+):(\d+): (fatal error|error|warning|note): (.*)$/;

/** `In file included from <file>:<line>:` and its continuation lines, which say which snippet line pulled a header in. */
const INCLUDED_FROM = /^\s*(?:In file included )?from (.*):(\d+):$/;

/** The command runner's limit for one check (NodeCommandRunner), named in the timeout message. */
const CHECK_TIMEOUT_SECONDS = 20;

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
			await this.fileSystem.writeTextFile(preludeFile, PRELUDE);
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

/** The check's answer from clang's exit code and output: `ok` only on exit code 0 with no errors; a killed run is a timeout error; a failure with no message about the snippet still fails on line 1 (A411). */
export function resultOf(exitCode: number | null, compilerOutput: string, snippetFile: string): SyntaxCheckResult
{
	if (exitCode === null) return { ok: false, diagnostics: [{ line: 1, severity: "error", message: `The syntax check took longer than ${CHECK_TIMEOUT_SECONDS} seconds and was stopped. Try again; the first check after a build can be slower.` }] };

	const diagnostics = parseDiagnostics(compilerOutput, snippetFile);
	const hasError = diagnostics.some((diagnostic) => diagnostic.severity === "error");

	if (exitCode !== 0 && !hasError)
	{
		const firstLine = compilerOutput.split(/\r?\n/).find((line) => line.trim() !== "") ?? `exit code ${exitCode}`;

		diagnostics.unshift({ line: 1, severity: "error", message: `The compiler failed: ${firstLine.trim()}` });
	}

	return { ok: exitCode === 0 && !hasError, diagnostics };
}

/** A header error waiting to learn which snippet line caused it. */
interface PendingHeaderError
{
	message: string;
	line: number | null;
	column?: number;

	/** True once an "in instantiation ... requested here" note in the snippet placed it; other snippet notes only place it until then. */
	placedByInstantiation: boolean;
}

/**
 * The snippet's errors and warnings in line order. An error inside a header (an engine template the snippet
 * instantiated, a header it included) is reported on the snippet line that caused it: the "in instantiation of ...
 * requested here" note in the snippet, else the "In file included from Snippet:N" line, else line 1, with the
 * header's message and file name. Header warnings and what skipping UHT causes are dropped.
 */
export function parseDiagnostics(compilerOutput: string, snippetFile: string): SyntaxDiagnostic[]
{
	const snippetName = snippetFile.slice(Math.max(snippetFile.lastIndexOf("/"), snippetFile.lastIndexOf("\\")) + 1);
	const isSnippet = (file: string): boolean => file.endsWith(snippetName);
	const diagnostics: SyntaxDiagnostic[] = [];
	let includedFromLine: number | null = null;
	const state: { pending: PendingHeaderError | null; lastInstantiation: { line: number; column?: number } | null } = { pending: null, lastInstantiation: null };

	const flush = (): void =>
	{
		const waiting = state.pending;
		state.pending = null;
		if (!waiting) return;

		// Clang prints the instantiation stack only for the first error of an instantiation; follow-on errors carry just a forward-declaration note.
		const place = waiting.placedByInstantiation ? { line: waiting.line ?? 1, column: waiting.column } : (state.lastInstantiation ?? { line: waiting.line ?? 1, column: waiting.column });
		if (waiting.placedByInstantiation) state.lastInstantiation = place;

		diagnostics.push({ line: place.line, ...(place.column === undefined ? {} : { column: place.column }), severity: "error", message: waiting.message });
	};

	for (const line of compilerOutput.split(/\r?\n/))
	{
		const included = INCLUDED_FROM.exec(line);
		if (included)
		{
			if (isSnippet(included[1] ?? "")) includedFromLine = Number(included[2]);
			continue;
		}

		const match = DIAGNOSTIC.exec(line);
		if (!match) continue;

		const [, file = "", lineText = "1", columnText = "1", severity = "error", message = ""] = match;

		if (severity === "note")
		{
			// An instantiation note in the snippet names the line that caused the header error; any other snippet note (a forward declaration) only stands in until one comes.
			const waiting = state.pending;
			const instantiation = message.includes("requested here");

			if (waiting && isSnippet(file) && !waiting.placedByInstantiation && (instantiation || waiting.column === undefined))
			{
				state.pending = { message: waiting.message, line: Number(lineText), column: Number(columnText), placedByInstantiation: instantiation };
			}
			continue;
		}

		flush();

		if (UHT_ARTIFACTS.some((pattern) => pattern.test(message))) continue;

		if (isSnippet(file))
		{
			state.lastInstantiation = null;
			diagnostics.push({ line: Number(lineText), column: Number(columnText), severity: severity === "warning" ? "warning" : "error", message });
		}
		else if (severity !== "warning")
		{
			const headerName = file.slice(Math.max(file.lastIndexOf("/"), file.lastIndexOf("\\")) + 1);

			state.pending = { message: `${message} (in ${headerName})`, line: includedFromLine, placedByInstantiation: false };
		}

		includedFromLine = null;
	}

	flush();

	return diagnostics.sort((left, right) => left.line - right.line || (left.column ?? 0) - (right.column ?? 0));
}
