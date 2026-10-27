// Types for long operations that stream progress (quest runs, sandbox setup) and for a build quest's verdict. See docs/systems/unreal-pipeline.md.
import type { AppError } from "./errors";

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

	/** Set when the run failed for a reason outside the learner's code (toolchain, engine, disk, an earlier quest), explained in plain English. Absent for a pass and for the learner's own compile or test failures. */
	unrelatedFailure?: AppError;
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

/** What the renderer sends to syntax-check the editable example in a concept quest's scratch buffer. */
export interface SyntaxCheckRequest
{
	/** The concept quest the example belongs to (its terms decide which headers the check includes). */
	questId: string;

	/** The scratch buffer's C++ text. */
	code: string;
}

/** One problem the syntax check found. */
export interface SyntaxDiagnostic
{
	/** Line in the scratch buffer, from 1. */
	line: number;

	/** Column, from 1, when the checker reports one. */
	column?: number;

	/** How serious it is. */
	severity: "error" | "warning";

	/** The checker's message, filtered to plain text. */
	message: string;
}

/** Answer of a scratch buffer syntax check. Never builds or runs anything. */
export interface SyntaxCheckResult
{
	/** True when there are no errors. */
	ok: boolean;

	/** Every error and warning, in line order. */
	diagnostics: SyntaxDiagnostic[];
}

/** How a finished run ended, as main remembers it for `getRunStatus`: the call's answer, or the AppError it failed with. */
export type RunAnswer = { ok: true; value: unknown } | { ok: false; error: AppError };

/** Where a run stands, for a renderer that stopped hearing progress or never got the call's answer (A820). */
export interface RunStatus
{
	/** The run asked about. */
	runId: string;

	/** `running` while the operation goes on; `finished` once it ended (kept for a while after); `unknown` when main never saw the id or forgot it. */
	state: "running" | "finished" | "unknown";

	/** The latest progress event main sent for the run, or null before the first one. */
	lastEvent: BuildProgressEvent | null;

	/** How many progress events main has sent for the run. A window compares it with what it has seen to tell new output from none. */
	eventCount: number;

	/** How it ended, once `finished`. The value has the type of the call that started the run. */
	answer: RunAnswer | null;
}
