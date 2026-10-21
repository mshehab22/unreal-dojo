// Reads the `index.json` a headless automation run writes with -ReportExportPath (format verified on UE 5.8.3, A44).
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** The result of one test in a report. */
export interface AutomationTestOutcome
{
	passed: boolean;
	state: string;

	/** Error and warning messages the test logged. */
	messages: string[];
}

/** The parts of one `tests[]` entry the verifier reads. */
interface ReportTest
{
	fullTestPath?: string;
	state?: string;
	errors?: number;
	entries?: { event?: { type?: string; message?: string } }[];
}

/**
 * Reads `<reportFolder>/index.json` (UTF-8 with a byte order mark). A test passes when its state is `Success`;
 * "succeeded with warnings" also reports `Success` with warning entries, which counts as passed. Returns undefined when
 * the file is missing or unreadable.
 */
export async function readAutomationReport(reportFolder: string): Promise<Map<string, AutomationTestOutcome> | undefined>
{
	const text = await readFile(join(reportFolder, "index.json"), "utf8").catch(() => undefined);

	if (text === undefined) return undefined;

	let report: { tests?: ReportTest[] };

	try
	{
		report = JSON.parse(text.replace(/^﻿/, "")) as { tests?: ReportTest[] };
	}
	catch
	{
		return undefined;
	}

	const outcomes = new Map<string, AutomationTestOutcome>();

	for (const test of report.tests ?? [])
	{
		if (test.fullTestPath === undefined) continue;

		const state = test.state ?? "Unknown";
		const messages = (test.entries ?? [])
			.filter((entry) => entry.event?.type === "Error" || entry.event?.type === "Warning")
			.map((entry) => `${entry.event?.type}: ${entry.event?.message ?? ""}`);

		outcomes.set(test.fullTestPath, { passed: state === "Success", state, messages });
	}

	return outcomes;
}
