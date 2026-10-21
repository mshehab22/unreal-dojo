// The time source the progress services read, injected so tests are deterministic.

/** Tells the current time. The app uses SystemClock; tests pass a fixed clock. */
export interface Clock
{
	/** Returns the current moment. */
	now(): Date;
}
