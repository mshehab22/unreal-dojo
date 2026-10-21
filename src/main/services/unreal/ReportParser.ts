// Reads the automation report (`index.json`) a headless test run writes.
import type { TestCaseResult } from "@shared/types/run";

/** What the report says, or why it could not be read. */
export type ParsedReport = { ok: true; tests: TestCaseResult[] } | { ok: false; problem: string };

/** One test as `index.json` records it. Only the fields the app reads. */
interface ReportTest
{
	fullTestPath?: unknown;
	state?: unknown;
	duration?: unknown;
	entries?: unknown;
}

/** Report states that count as passed. A test that logged a warning still passed. */
const PASSED_STATES = new Set(["Success", "SuccessWithWarnings"]);

/** Turns `index.json` text into test results. The report decides pass or fail, not the editor's exit code. */
export class ReportParser
{
	/** Parses the report text (UTF-8 with a byte order mark on 5.8.3). */
	parse(text: string): ParsedReport
	{
		let parsed: unknown;

		try
		{
			parsed = JSON.parse(text.replace(/^﻿/, ""));
		}
		catch (error)
		{
			return { ok: false, problem: `The test report is not valid JSON (${(error as Error).message}).` };
		}

		const tests = (parsed as { tests?: unknown } | null)?.tests;
		if (!Array.isArray(tests)) return { ok: false, problem: "The test report has no tests list." };

		return { ok: true, tests: tests.map((test: ReportTest) => toTestCase(test)) };
	}
}

/** Maps one report entry to a TestCaseResult. */
function toTestCase(test: ReportTest): TestCaseResult
{
	const passed = typeof test.state === "string" && PASSED_STATES.has(test.state);
	const result: TestCaseResult = { name: typeof test.fullTestPath === "string" ? test.fullTestPath : "(unnamed test)", passed };

	if (typeof test.duration === "number") result.durationMs = Math.round(test.duration * 1000);

	const message = passed ? undefined : firstErrorMessage(test.entries) ?? describeState(test.state);
	if (message) result.message = message;

	return result;
}

/** The first `Error` event's message, which holds the failed assertion text. */
function firstErrorMessage(entries: unknown): string | undefined
{
	if (!Array.isArray(entries)) return undefined;

	for (const entry of entries)
	{
		const event = (entry as { event?: { type?: unknown; message?: unknown } } | null)?.event;

		if (event?.type === "Error" && typeof event.message === "string") return event.message;
	}

	return undefined;
}

/** A message for a failed test that logged no error, from its state. */
function describeState(state: unknown): string
{
	if (state === "NotRun") return "The test did not run.";

	if (state === "InProcess") return "The test was still running when the engine stopped.";

	return `The test ended in state ${String(state)}.`;
}
