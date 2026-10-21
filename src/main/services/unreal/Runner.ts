// The one interface both loops (headless now, the fast editor loop in M1.4) sit behind.
import type { RunResult } from "@shared/types/run";

import type { ProgressListener } from "./ProgressUpdate";
import type { QuestForWriting } from "./QuestFileWriter";

/** Builds and tests one quest's files. Never throws: pipeline problems land in `RunResult.error`, a cancel in `error` with `cancelled` set by the caller's signal. */
export interface IRunner
{
	/** Writes the files, builds, runs the quest's tests, and resolves with the verdict. */
	run(quest: QuestForWriting, files: Record<string, string>, onProgress: ProgressListener, signal: AbortSignal): Promise<RunResult>;
}

/** Where runs happen: the engine and the sandbox project. */
export interface RunnerContext
{
	/** Engine root folder (the one that contains `Engine/`). */
	engineRoot: string;

	/** Sandbox project folder (the one that contains `Dojo.uproject`). */
	sandboxFolder: string;
}
