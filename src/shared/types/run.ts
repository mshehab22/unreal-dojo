// Types for long operations that stream progress (quest runs, sandbox setup) and for a build quest's verdict. See docs/systems/unreal-pipeline.md.

/** Which loop produced a result: Live Coding plus MCP tests in the open editor, or UnrealBuildTool plus headless tests (D09). */
export type LoopKind = "fast" | "headless";

/** The step a long operation is in. `preparing` covers copying the template and choosing the loop; `reviewing` is the AI review after tests. */
export type BuildPhase = "preparing" | "writing" | "building" | "launching" | "testing" | "parsing" | "reviewing";

/** One progress update for a long operation, sent on the build progress channel. */
export interface BuildProgressEvent
{
	/** The id the renderer gave the operation when it started it. */
	runId: string;

	/** Current step. */
	phase: BuildPhase;

	/** Milliseconds since the operation started. */
	elapsedMs: number;

	/** Latest filtered log line, shown under the progress bar. */
	lastLine: string;

	/** Rough completion from 0 to 100 when the step can tell. */
	percent?: number;

	/** The loop chosen for this run, once it is known. */
	loop?: LoopKind;

	/** Why that loop was chosen, for example "header changed, full build needed". Sent once with the choice. */
	loopReason?: string;
}

/** One automation test case and how it went. */
export interface TestCaseResult
{
	/** Full test name, for example `Dojo.W1.HealthComponent.TakesDamage`. */
	name: string;

	/** True when the test passed. */
	passed: boolean;

	/** First error or the failure message, when there is one. */
	message?: string;

	/** How long the test took. */
	durationMs?: number;
}

/** The verdict of one Run: did it compile, which tests passed, what the engine said. */
export interface RunResult
{
	/** True when it compiled and every test passed. */
	ok: boolean;

	/** True when compilation succeeded. */
	compiled: boolean;

	/** Filtered compiler output (errors, warnings, lines about `Quests/` and `Tests/`). */
	compilerOutput: string;

	/** Every test case that ran. */
	tests: TestCaseResult[];

	/** How many tests passed. */
	testsPassed: number;

	/** How many tests ran. */
	testsTotal: number;

	/** Wall time of the whole run. */
	durationMs: number;

	/** Which loop ran. */
	loop: LoopKind;

	/** A pipeline problem unrelated to the learner's code (engine crashed, timeout), in plain English. */
	error?: string;
}

/** What the renderer sends to run or submit a build, refactor, or boss integration quest. */
export interface RunRequest
{
	/** Id the renderer generates (`crypto.randomUUID()`) so it can cancel and match progress events before the call returns. */
	runId: string;

	/** The quest being run. */
	questId: string;

	/** The learner's files by file name, for example `{ "DojoHealthComponent.h": "..." }`. Names only, never paths. */
	files: Record<string, string>;
}

/** What the renderer sends to create or rebuild the sandbox project. */
export interface SandboxSetupRequest
{
	/** Id the renderer generates so it can cancel and match progress events. */
	runId: string;

	/** Engine root folder to associate the sandbox with. */
	enginePath: string;

	/** Folder to create the sandbox in (from `pickSandboxFolder`). */
	folder: string;
}
