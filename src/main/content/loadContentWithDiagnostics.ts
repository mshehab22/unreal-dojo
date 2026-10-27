// Loads the content folder and, when that takes long, warns with where the time went, so a slow CI or a slow disk names its own cause.
import type { LoadedContent } from "@shared/types/content";

import type { ContentLoadOptions, ContentLoadTimings } from "../services/content";

/** A load slower than this logs the warning. A working machine loads the real content in well under a tenth of a second. */
export const SLOW_CONTENT_LOAD_MILLISECONDS = 2000;

/** How often the stall watch ticks while loading, in milliseconds. */
const STALL_TICK_MILLISECONDS = 10;

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

	/** Receives the warning line. Defaults to `console.warn`. */
	log?: (line: string) => void;
}

/** Watches the main process while a load runs: a timer ticks every few milliseconds, and a tick that comes late means something else held the thread. */
interface StallWatch
{
	/** Stops the timer and returns the longest time the thread was held, in milliseconds. */
	stop: () => number;
}

/** Starts a stall watch. The first gap is measured from this call, so a stall that begins straight away is counted too. */
function startStallWatch(): StallWatch
{
	let previousTickAt = performance.now();
	let longestGapMilliseconds = 0;

	const timer = setInterval(() =>
	{
		const tickAt = performance.now();

		longestGapMilliseconds = Math.max(longestGapMilliseconds, tickAt - previousTickAt);
		previousTickAt = tickAt;
	}, STALL_TICK_MILLISECONDS);

	return {
		stop: () =>
		{
			clearInterval(timer);

			// A gap includes the tick interval itself, which is not a stall.
			return Math.max(0, longestGapMilliseconds - STALL_TICK_MILLISECONDS);
		},
	};
}

/** Says what the figures point at: a long blocked stretch means the reads were held up by the main process, a short one means the reads themselves were slow. */
function describeLikelyCause(elapsedMilliseconds: number, longestStallMilliseconds: number): string
{
	const blockedForMostOfTheLoad = longestStallMilliseconds >= elapsedMilliseconds / 2;

	if (blockedForMostOfTheLoad) return "The main process was blocked for much of the load, so the reads were held up by something else running there, not by the disk.";

	return "The main process was not blocked for long, so slow reads here point at the disk or a virus scanner.";
}

/** Builds the warning line: the total, the read and parse split, the longest stretch the main process did nothing else, and what that points at. */
function describeSlowLoad(elapsedMilliseconds: number, timings: ContentLoadTimings, longestStallMilliseconds: number): string
{
	const averageReadMilliseconds = timings.questFileCount === 0 ? 0 : timings.totalReadMilliseconds / timings.questFileCount;
	const seconds = (milliseconds: number): string => (milliseconds / 1000).toFixed(1);

	return `[content] slow load: ${timings.questFileCount} quest files took ${seconds(elapsedMilliseconds)} s in all. Reading them added up to ${seconds(timings.totalReadMilliseconds)} s (${Math.round(averageReadMilliseconds)} ms per file, which also counts any time the main process was blocked), parsing took ${seconds(timings.totalParseMilliseconds)} s, and the main process was blocked for at most ${Math.round(longestStallMilliseconds)} ms at a time. ${describeLikelyCause(elapsedMilliseconds, longestStallMilliseconds)}`;
}

/** Loads the content with the loader and logs one warning line when the load takes `slowAfterMilliseconds` or more. Rethrows a failed load. */
export async function loadContentWithDiagnostics(loader: TimedContentLoader, options: ContentLoadDiagnosticsOptions = {}): Promise<LoadedContent>
{
	const slowAfterMilliseconds = options.slowAfterMilliseconds ?? SLOW_CONTENT_LOAD_MILLISECONDS;
	const now = options.now ?? (() => performance.now());
	const log = options.log ?? ((line: string) => console.warn(line));
	let timings: ContentLoadTimings = { questFileCount: 0, totalReadMilliseconds: 0, totalParseMilliseconds: 0 };
	const startedAt = now();
	const stallWatch = startStallWatch();
	let stallWatchStopped = false;

	try
	{
		const content = await loader.load({ onTimings: (reported) => { timings = reported; } });
		const elapsedMilliseconds = now() - startedAt;

		if (elapsedMilliseconds >= slowAfterMilliseconds)
		{
			// A stall is only recorded when the timer next ticks after it, so give the timer a moment to do that.
			await new Promise((resolve) => setTimeout(resolve, STALL_TICK_MILLISECONDS * 2));

			stallWatchStopped = true;
			log(describeSlowLoad(elapsedMilliseconds, timings, stallWatch.stop()));
		}

		return content;
	}
	finally
	{
		if (!stallWatchStopped) stallWatch.stop();
	}
}
