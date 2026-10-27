// Reads what CompileLiveCoding answered. The engine's toolset answers plain text: `Result: <name>` followed by the compile output, or `Error: ...` when Live Coding cannot run (UE 5.8.3, A1071). It is read defensively, since other engine versions may differ.

/** What a Live Coding compile did. `needs-full-build` and `unavailable` send the run to the headless loop. */
export type LiveCodingStatus = "succeeded" | "no-changes" | "failed" | "needs-full-build" | "unavailable" | "busy";

/** The status and the text to show as compiler output. */
export interface LiveCodingAnswer
{
	status: LiveCodingStatus;
	output: string;
}

/** ELiveCodingCompileResult names, as a structured answer may carry them. */
const RESULT_NAMES: Record<string, LiveCodingStatus> = {
	success: "succeeded",
	nochanges: "no-changes",
	inprogress: "busy",
	compilestillactive: "busy",
	notstarted: "unavailable",
	compilenotstarted: "unavailable",
	failure: "failed",
	cancelled: "failed",
};

/** Wording that means Live Coding cannot run in this editor at all, so the headless loop must be used: a Mac build, a module that is not loaded, a session without Live Coding (A1071). It is checked before the generic error match, because these answers also begin with "Error:". */
const UNAVAILABLE_WORDING = /not available|not enabled|not loaded|not started|cannot be enabled|unable to start/;

/** An answer that is only a `Result:` line, with nothing after it. */
const BARE_RESULT_LINE = /^\s*Result:\s*\S+\s*$/i;

/** Reads the answer: a known result name in a JSON field or a `Result:` line first, then the text. Anything not recognised counts as needing a full build, the safe choice. */
export function readLiveCodingAnswer(text: string): LiveCodingAnswer
{
	const structured = structuredStatus(text);
	const output = outputOf(text);

	// A bare `Result: Failure` has no `Compile Output:` or `Compiler Diagnostics:` after it (the toolset adds them only when they have text), so there is nothing to show; the headless loop will show the real compiler output.
	if (structured === "failed" && BARE_RESULT_LINE.test(text)) return { status: "needs-full-build", output };

	if (structured) return { status: structured, output };

	const lower = text.toLowerCase();

	if (UNAVAILABLE_WORDING.test(lower)) return { status: "unavailable", output };
	if (/no ?changes/.test(lower)) return { status: "no-changes", output };
	if (/in ?progress|still active/.test(lower)) return { status: "busy", output };
	if (/restart|full build|not supported|unsupported/.test(lower)) return { status: "needs-full-build", output };
	if (/\berror\b|fail/.test(lower)) return { status: "failed", output };
	if (/succe(ss|eded)/.test(lower)) return { status: "succeeded", output };

	return { status: "needs-full-build", output };
}

/** A known result name from a `result`, `status`, or `Result` field of a JSON answer. */
function structuredStatus(text: string): LiveCodingStatus | null
{
	const record = parseObject(text);
	if (!record) return resultLineStatus(text);

	for (const key of ["result", "Result", "status", "Status"])
	{
		const value = record[key];
		const status = typeof value === "string" ? RESULT_NAMES[value.replace(/^ELiveCodingCompileResult::/, "").toLowerCase()] : undefined;

		if (status) return status;
	}

	return null;
}

/** A known result name from a `Result: <name>` line, which the engine's toolset writes first; null when there is none. */
function resultLineStatus(text: string): LiveCodingStatus | null
{
	const match = /^\s*Result:\s*(?:ELiveCodingCompileResult::)?(\w+)/i.exec(text);

	return match ? (RESULT_NAMES[match[1]!.toLowerCase()] ?? null) : null;
}

/** The log text of a JSON answer (`log`, `output`, `Log`), or the whole text. */
function outputOf(text: string): string
{
	const record = parseObject(text);
	if (!record) return text;

	for (const key of ["log", "Log", "output", "Output", "message", "Message"])
	{
		if (typeof record[key] === "string") return record[key] as string;
	}

	return text;
}

/** The text parsed as a JSON object, or null. */
function parseObject(text: string): Record<string, unknown> | null
{
	try
	{
		const parsed: unknown = JSON.parse(text);

		return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
	}
	catch
	{
		return null;
	}
}
