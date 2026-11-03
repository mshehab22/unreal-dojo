// Turns a compiler's output into the snippet check's answer, the same way for clang and MSVC (A411); each compiler supplies its line format as a dialect.
import type { SyntaxCheckResult, SyntaxDiagnostic } from "@shared/types/run";

/** One diagnostic line as a compiler printed it. */
export interface CompilerDiagnostic
{
	file: string;
	line: number;

	/** Missing when the compiler printed only a line number. */
	column?: number;

	severity: "fatal error" | "error" | "warning" | "note";
	message: string;
}

/** How one compiler prints its diagnostics. */
export interface CompilerDialect
{
	/** Reads one output line as a diagnostic, or null for any other line (code excerpts, carets, banners). */
	diagnostic(line: string): CompilerDiagnostic | null;

	/** Reads an "included from <file>:<line>" line, which says which snippet line pulled a header in, or null. */
	includedFrom(line: string): { file: string; line: number } | null;

	/** True for a note that names the place a template was instantiated from. */
	isInstantiationNote(message: string): boolean;
}

/** The command runner's limit for one check (NodeCommandRunner), named in the timeout message. */
export const CHECK_TIMEOUT_SECONDS = 20;

/** Messages caused by skipping UHT, not by the learner: names GENERATED_BODY would have declared. */
const UHT_ARTIFACTS = [/'Super'/, /'ThisClass'/, /StaticClass/, /\.generated\.h/];

/** The check's answer from the compiler's exit code and output: `ok` only on exit code 0 with no errors; a killed run is a timeout error; a failure with no message about the snippet still fails on line 1, quoting the compiler's first error line (A411). */
export function snippetCheckResult(exitCode: number | null, compilerOutput: string, snippetFile: string, dialect: CompilerDialect): SyntaxCheckResult
{
	if (exitCode === null) return { ok: false, diagnostics: [{ line: 1, severity: "error", message: `The syntax check took longer than ${CHECK_TIMEOUT_SECONDS} seconds and was stopped. Try again; the first check after a build can be slower.` }] };

	const diagnostics = parseSnippetDiagnostics(compilerOutput, snippetFile, dialect);
	const hasError = diagnostics.some((diagnostic) => diagnostic.severity === "error");

	if (exitCode !== 0 && !hasError)
	{
		const outputLines = compilerOutput.split(/\r?\n/);
		const firstLine = outputLines.find((line) => /\berror\b/.test(line)) ?? outputLines.find((line) => line.trim() !== "") ?? `exit code ${exitCode}`;

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

	/** What placed it so far: nothing, another note in the snippet (a declaration), or an instantiation note in the snippet, which wins. */
	placedBy: "nothing" | "note" | "instantiation";
}

/**
 * The snippet's errors and warnings in line order. An error inside a header (an engine template the snippet
 * instantiated, a header it included) is reported on the snippet line that caused it: the instantiation note
 * located in the snippet, else another snippet note, else the "included from Snippet:N" line, else line 1, with
 * the header's message and file name. Header warnings and what skipping UHT causes are dropped.
 */
export function parseSnippetDiagnostics(compilerOutput: string, snippetFile: string, dialect: CompilerDialect): SyntaxDiagnostic[]
{
	const snippetName = fileNameOf(snippetFile);
	const isSnippet = (file: string): boolean => file.endsWith(snippetName);
	const diagnostics: SyntaxDiagnostic[] = [];
	let includedFromLine: number | null = null;
	const state: { pending: PendingHeaderError | null; lastInstantiation: { line: number; column?: number } | null } = { pending: null, lastInstantiation: null };

	const flush = (): void =>
	{
		const waiting = state.pending;
		state.pending = null;
		if (!waiting) return;

		// Compilers print the instantiation stack only for the first error of an instantiation; follow-on errors carry just a declaration note.
		const placedByInstantiation = waiting.placedBy === "instantiation";
		const place = placedByInstantiation ? { line: waiting.line ?? 1, column: waiting.column } : (state.lastInstantiation ?? { line: waiting.line ?? 1, column: waiting.column });
		if (placedByInstantiation) state.lastInstantiation = place;

		diagnostics.push({ line: place.line, ...(place.column === undefined ? {} : { column: place.column }), severity: "error", message: waiting.message });
	};

	for (const line of compilerOutput.split(/\r?\n/))
	{
		const included = dialect.includedFrom(line);
		if (included)
		{
			if (isSnippet(included.file)) includedFromLine = included.line;
			continue;
		}

		const diagnostic = dialect.diagnostic(line);
		if (!diagnostic) continue;

		if (diagnostic.severity === "note")
		{
			// An instantiation note in the snippet names the line that caused the header error; any other snippet note (a declaration) only stands in until one comes.
			const waiting = state.pending;
			const instantiation = dialect.isInstantiationNote(diagnostic.message);

			if (waiting && isSnippet(diagnostic.file) && waiting.placedBy !== "instantiation" && (instantiation || waiting.placedBy === "nothing"))
			{
				state.pending = { message: waiting.message, line: diagnostic.line, ...(diagnostic.column === undefined ? {} : { column: diagnostic.column }), placedBy: instantiation ? "instantiation" : "note" };
			}
			continue;
		}

		flush();

		if (UHT_ARTIFACTS.some((pattern) => pattern.test(diagnostic.message))) continue;

		if (isSnippet(diagnostic.file))
		{
			state.lastInstantiation = null;
			diagnostics.push({ line: diagnostic.line, ...(diagnostic.column === undefined ? {} : { column: diagnostic.column }), severity: diagnostic.severity === "warning" ? "warning" : "error", message: diagnostic.message });
		}
		else if (diagnostic.severity !== "warning")
		{
			state.pending = { message: `${diagnostic.message} (in ${fileNameOf(diagnostic.file)})`, line: includedFromLine, placedBy: "nothing" };
		}

		includedFromLine = null;
	}

	flush();

	// MSVC repeats a template error for each column of the same header line; the learner needs it once.
	const seen = new Set<string>();
	const unique = diagnostics.filter((diagnostic) =>
	{
		const key = `${diagnostic.line}:${diagnostic.column ?? ""}:${diagnostic.severity}:${diagnostic.message}`;
		if (seen.has(key)) return false;

		seen.add(key);

		return true;
	});

	return unique.sort((left, right) => left.line - right.line || (left.column ?? 0) - (right.column ?? 0));
}

/** The last part of a path, with either separator. */
function fileNameOf(filePath: string): string
{
	return filePath.slice(Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\")) + 1);
}
