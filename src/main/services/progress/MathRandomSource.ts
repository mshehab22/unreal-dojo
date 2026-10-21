// The real randomness used by the app.
import type { RandomSource } from "./RandomSource";

/** Uses Math.random. Good enough for chests and drill order; nothing here is security sensitive. */
export class MathRandomSource implements RandomSource
{
	/** Returns a number from 0 (inclusive) to 1 (exclusive). */
	next(): number
	{
		return Math.random();
	}
}
