// Loads the content folder and, when that takes long, warns with where the time went, so a slow CI or a slow disk names its own cause.
import { monitorEventLoopDelay } from "node:perf_hooks";

import type { LoadedContent } from "@shared/types/content";

import type { ContentLoadOptions, ContentLoadTimings } from "../services/content";

/** A load slower than this logs the warning. A working machine loads the real content in well under a tenth of a second. */
export const SLOW_CONTENT_LOAD_MILLISECONDS = 2000;

/** How often the event loop is sampled while loading, in milliseconds. */
const STALL_SAMPLE_RESOLUTION_MILLISECONDS = 10;

/** The part of the loader the diagnostics need. */
export interface TimedContentLoader
{
	/** Loads the content folder and reports where the time went through `onTimings`. */
	load: (options?: ContentLoadOptions) => Promise<LoadedContent>;
}

/** What the wrapper needs besides the loader; tests pass a clock, a threshold and a collector. */
export interface ContentLoadDiagnosticsOptions
{
	/** The load time at or above which the warning is logged. */
	slowAfterMilliseconds?: number;

	/** Returns the current time in milliseconds. Defaults to `performance.now`. */
	now?: () => number;

	/** Receives the warning line. Defaults to `console.warn`, which main's log forwards. */
	log?: (line: string) => void;
}

/** Builds the warning line: the total, the read and parse split, and the longest stretch the main process did nothing else. */
function describeSlowLoad(elapsedMilliseconds: number, timings: ContentLoadTimings, longestStallMilliseconds: number): string
{
	const averageReadMilliseconds = timings.questFileCount === 0 ? 0 : timings.totalReadMilliseconds / timings.questFileCount;
	const seconds = (milliseconds: number): string => (milliseconds / 1000).toFixed(1);

	return `[content] slow load: ${timings.questFileCount} quest files took ${seconds(elapsedMilliseconds)} s in all. Reading them added up to ${seconds(timings.totalReadMilliseconds)} s (${Math.round(averageReadMilliseconds)} ms per file), parsing took ${seconds(timings.totalParseMilliseconds)} s, and the main process was blocked for at most ${Math.round(longestStallMilliseconds)} ms at a time. Many slow reads point at the disk or a virus scanner, a long blocked stretch points at something else running in the main process.`;
}

/** Loads the content with the loader and logs one warning line when the load takes `slowAfterMilliseconds` or more. Rethrows a failed load. */
export async function loadContentWithDiagnostics(loader: TimedContentLoader, options: ContentLoadDiagnosticsOptions = {}): Promise<LoadedContent>
{
	const slowAfterMilliseconds = options.slowAfterMilliseconds ?? SLOW_CONTENT_LOAD_MILLISECONDS;
	const now = options.now ?? (() => performance.now());
	const log = options.log ?? ((line: string) => console.warn(line));
	const stallMonitor = monitorEventLoopDelay({ resolution: STALL_SAMPLE_RESOLUTION_MILLISECONDS });
	let timings: ContentLoadTimings = { questFileCount: 0, totalReadMilliseconds: 0, totalParseMilliseconds: 0 };
	const startedAt = now();

	stallMonitor.enable();

	try
	{
		const content = await loader.load({ onTimings: (reported) => { timings = reported; } });
		const elapsedMilliseconds = now() - startedAt;

		if (elapsedMilliseconds >= slowAfterMilliseconds)
		{
			// A stall is only recorded once the sampling timer fires after it, so give the timer a moment to do that.
			await new Promise((resolve) => setTimeout(resolve, STALL_SAMPLE_RESOLUTION_MILLISECONDS * 2));

			// The histogram reports nanoseconds, and its largest sample includes the sampling interval itself.
			const longestStallMilliseconds = Math.max(0, stallMonitor.max / 1e6 - STALL_SAMPLE_RESOLUTION_MILLISECONDS);

			log(describeSlowLoad(elapsedMilliseconds, timings, longestStallMilliseconds));
		}

		return content;
	}
	finally
	{
		stallMonitor.disable();
	}
}
