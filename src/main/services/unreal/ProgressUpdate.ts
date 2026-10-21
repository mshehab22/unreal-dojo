// The part of a progress event a service fills in; the IPC layer adds the run id and elapsed time.
import type { BuildProgressEvent } from "@shared/types/run";

/** A progress event without `runId` and `elapsedMs`, which the caller stamps (A185). */
export type ProgressUpdate = Omit<BuildProgressEvent, "runId" | "elapsedMs">;

/** Receives progress updates from a long operation. */
export type ProgressListener = (update: ProgressUpdate) => void;
