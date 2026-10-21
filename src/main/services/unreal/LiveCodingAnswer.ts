// Reads what CompileLiveCoding answered. The answer's exact format is unverified (the Mac only answers "not available", A45), so it is read defensively.

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
	failure: "failed",
	cancelled: "failed",
};

/** Reads the answer: a known result name in a JSON field first, then the text. Anything not recognised counts as needing a full build, the safe choice. */
export function readLiveCodingAnswer(text: string): LiveCodingAnswer
{
	const structured = structuredStatus(text);
	const output = outputOf(text);

	if (structured) return { status: structured, output };

	const lower = text.toLowerCase();

	if (lower.includes("not available")) return { status: "unavailable", output };
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
	if (!record) return null;

	for (const key of ["result", "Result", "status", "Status"])
	{
		const value = record[key];
		const status = typeof value === "string" ? RESULT_NAMES[value.replace(/^ELiveCodingCompileResult::/, "").toLowerCase()] : undefined;

		if (status) return status;
	}

	return null;
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
