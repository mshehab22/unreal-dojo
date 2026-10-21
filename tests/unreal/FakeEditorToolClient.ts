// A scripted EditorToolClient for the fast loop runner tests.
import { EditorClientError } from "../../src/main/services/unreal/EditorClientError";
import type { EditorTestSummary, EditorToolClient } from "../../src/main/services/unreal/EditorToolClient";

/** Answers from fields tests set; each call is recorded by name. */
export class FakeEditorToolClient implements EditorToolClient
{
	/** Every call, in order: `isAnswering`, `runTests:<names>`, `compileLiveCoding`, `close`. */
	readonly calls: string[] = [];

	/** What isAnswering answers. */
	answering = true;

	/** What compileLiveCoding answers, or an error it throws. */
	compileAnswer: string | EditorClientError = JSON.stringify({ result: "Success", log: "Live coding succeeded" });

	/** What runTests answers, or an error it throws. */
	testAnswer: EditorTestSummary | EditorClientError = { tests: [] };

	/** Answers the scripted health. */
	async isAnswering(): Promise<boolean>
	{
		this.calls.push("isAnswering");

		return this.answering;
	}

	/** Answers or throws the scripted summary. */
	async runTests(testNames: string[]): Promise<EditorTestSummary>
	{
		this.calls.push(`runTests:${testNames.join("+")}`);

		if (this.testAnswer instanceof EditorClientError) throw this.testAnswer;

		return this.testAnswer;
	}

	/** Answers or throws the scripted compile. */
	async compileLiveCoding(): Promise<string>
	{
		this.calls.push("compileLiveCoding");

		if (this.compileAnswer instanceof EditorClientError) throw this.compileAnswer;

		return this.compileAnswer;
	}

	/** Records the close. */
	async close(): Promise<void>
	{
		this.calls.push("close");
	}
}
