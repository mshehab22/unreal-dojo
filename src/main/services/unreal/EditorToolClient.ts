// What the fast loop asks of an open editor, behind an interface so runners are tested without an editor or a server.

/** One automation test as the editor's RunTests answer reports it. */
export interface EditorTestCase
{
	/** Full test path, for example `Dojo.Sample.Health.TakesDamage`. */
	name: string;

	/** `Success`, `SuccessWithWarnings`, `Fail`, `Skipped`, `NotRun`, or whatever the editor sends. */
	state: string;

	/** Seconds, as the editor reports it. */
	durationSeconds?: number;

	/** Error messages, first one first. */
	errors: string[];
}

/** The finished summary RunTests returns. */
export interface EditorTestSummary
{
	tests: EditorTestCase[];
}

/** Talks to the editor's tools: health, tests, and Live Coding. Calls never overlap; each waits for the one before (the server runs tools one at a time on the game thread). */
export interface EditorToolClient
{
	/** True when the editor's server answers a cheap call. Never throws. */
	isAnswering(): Promise<boolean>;

	/** Runs exactly these tests and resolves with the summary. Discovers tests first, once per editor session. Throws EditorClientError. */
	runTests(testNames: string[]): Promise<EditorTestSummary>;

	/** Starts a Live Coding compile, waits for it, and resolves with what the tool returned. Throws EditorClientError. */
	compileLiveCoding(): Promise<string>;

	/** Ends the session. Never throws. */
	close(): Promise<void>;
}
