// Reads the editor tool answers, which arrive as JSON inside a string inside JSON (A44).
import { EditorClientError } from "./EditorClientError";
import type { EditorTestCase, EditorTestSummary } from "./EditorToolClient";

/** Unwraps a tool's text answer: `{"returnValue": "<text>"}` answers `<text>`; anything else answers the text unchanged. */
export function unwrapReturnValue(text: string): string
{
	try
	{
		const parsed: unknown = JSON.parse(text);

		if (typeof parsed === "object" && parsed !== null && "returnValue" in parsed)
		{
			const returnValue = (parsed as { returnValue: unknown }).returnValue;

			return typeof returnValue === "string" ? returnValue : JSON.stringify(returnValue);
		}
	}
	catch
	{
		// Plain text, for example "Error: Live Coding is not available in this build configuration."
	}

	return text;
}

/** Parses RunTests' unwrapped answer `{ tests: [{ name, state, duration, errors[] }], ... }`. Throws a `format` EditorClientError on any other shape. */
export function parseEditorTestSummary(returnValue: string): EditorTestSummary
{
	let parsed: unknown;

	try
	{
		parsed = JSON.parse(returnValue);
	}
	catch
	{
		throw new EditorClientError("format", `RunTests answered with something that is not JSON: ${returnValue.slice(0, 200)}`);
	}

	const tests = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>).tests : undefined;
	if (!Array.isArray(tests)) throw new EditorClientError("format", `RunTests answered without a tests list: ${returnValue.slice(0, 200)}`);

	return { tests: tests.map(toTestCase).filter((test): test is EditorTestCase => test !== null) };
}

/** One entry of the tests list; null when it has no name. Errors may be strings or objects with a message. */
function toTestCase(entry: unknown): EditorTestCase | null
{
	if (typeof entry !== "object" || entry === null) return null;

	const record = entry as Record<string, unknown>;
	const name = typeof record.name === "string" ? record.name : typeof record.fullTestPath === "string" ? record.fullTestPath : null;
	if (name === null) return null;

	const errors = Array.isArray(record.errors) ? record.errors.map(messageOf).filter((message) => message !== "") : [];
	const testCase: EditorTestCase = { name, state: typeof record.state === "string" ? record.state : "Unknown", errors };

	if (typeof record.duration === "number") testCase.durationSeconds = record.duration;

	return testCase;
}

/** The text of one error entry. */
function messageOf(error: unknown): string
{
	if (typeof error === "string") return error;
	if (typeof error === "object" && error !== null && typeof (error as Record<string, unknown>).message === "string") return (error as { message: string }).message;

	return "";
}
