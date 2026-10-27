// Checks that a failed start tells the learner in plain English, keeps the detail in the log, and quits.
import { describe, expect, it } from "vitest";

import { showStartupFailure, STARTUP_FAILURE_TEXT, STARTUP_FAILURE_TITLE } from "../../src/main/lifecycle/showStartupFailure";

/** Fakes that record what the failure screen did, in order. */
function createRecorder()
{
	const steps: string[] = [];
	const boxes: { title: string; content: string }[] = [];
	const logged: { message: string; error: unknown }[] = [];

	return {
		steps,
		boxes,
		logged,
		dependencies: {
			log: (message: string, error: unknown) =>
			{
				steps.push("log");
				logged.push({ message, error });
			},
			showErrorBox: (title: string, content: string) =>
			{
				steps.push("box");
				boxes.push({ title, content });
			},
			quit: () => steps.push("quit"),
		},
	};
}

describe("showStartupFailure", () =>
{
	it("logs the detail, shows a plain dialog, then quits", () =>
	{
		const recorder = createRecorder();
		const failure = new Error("EACCES: permission denied, open 'C:\\Users\\x\\progress.json'");

		showStartupFailure(failure, recorder.dependencies);

		expect(recorder.steps).toEqual(["log", "box", "quit"]);
		expect(recorder.logged[0]?.error).toBe(failure);
		expect(recorder.boxes[0]).toEqual({ title: STARTUP_FAILURE_TITLE, content: STARTUP_FAILURE_TEXT });
	});

	it("keeps the stack trace and the error text out of the dialog", () =>
	{
		const recorder = createRecorder();

		showStartupFailure(new Error("EACCES: permission denied"), recorder.dependencies);

		const shown = `${recorder.boxes[0]?.title} ${recorder.boxes[0]?.content}`;

		expect(shown).not.toContain("EACCES");
		expect(shown).not.toContain(" at ");
		expect(shown).not.toContain("Error:");
	});

	it("still quits when the dialog itself fails", () =>
	{
		const recorder = createRecorder();
		const dependencies = { ...recorder.dependencies, showErrorBox: () => { throw new Error("no display"); } };

		expect(() => showStartupFailure("odd failure", dependencies)).not.toThrow();
		expect(recorder.steps).toEqual(["log", "log", "quit"]);
	});
});
