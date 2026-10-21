// Randomness for tests: a fixed sequence that repeats.
import type { RandomSource } from "../../src/main/services/progress/RandomSource";

/** Returns the given numbers in order, then starts over. */
export class SequenceRandom implements RandomSource
{
	/** Index of the next number. */
	private index = 0;

	/** Uses `values` (each from 0 up to but not including 1). */
	constructor(private readonly values: number[] = [0])
	{}

	/** Returns the next number of the sequence. */
	next(): number
	{
		const value = this.values[this.index % this.values.length] ?? 0;
		this.index++;

		return value;
	}
}
