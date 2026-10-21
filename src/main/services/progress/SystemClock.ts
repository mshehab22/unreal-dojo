// The real clock used by the app.
import type { Clock } from "./Clock";

/** Reads the computer's clock. */
export class SystemClock implements Clock
{
	/** Returns the current moment. */
	now(): Date
	{
		return new Date();
	}
}
