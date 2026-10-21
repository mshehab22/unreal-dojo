// A clock tests can set and move forward.
import type { Clock } from "../../src/main/services/progress/Clock";

/** Returns a set moment until moved. */
export class FixedClock implements Clock
{
	/** Starts at `moment`. */
	constructor(private moment: Date)
	{}

	/** Returns the set moment. */
	now(): Date
	{
		return new Date(this.moment.getTime());
	}

	/** Moves to a new moment. */
	set(moment: Date): void
	{
		this.moment = moment;
	}

	/** Moves forward by whole or fractional days. */
	advanceDays(days: number): void
	{
		this.moment = new Date(this.moment.getTime() + days * 24 * 60 * 60 * 1000);
	}
}
