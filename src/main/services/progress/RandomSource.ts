// The randomness the progress services use (chests, offers, drill order), injected so tests are deterministic.

/** Gives random numbers. The app uses MathRandomSource; tests pass a fixed sequence. */
export interface RandomSource
{
	/** Returns a number from 0 (inclusive) to 1 (exclusive). */
	next(): number;
}
