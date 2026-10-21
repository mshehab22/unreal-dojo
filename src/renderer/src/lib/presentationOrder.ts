// Shuffles the order choices and Parsons lines are shown in, per presentation (A61). Answers keep referring to the authored order.

/** A random number in [0, 1), injectable so tests are repeatable. */
export type RandomNumber = () => number;

/** A random permutation of 0..count-1 (Fisher-Yates). With two or more items it never returns the authored order, so position never gives the answer away. */
export function shuffledOrder(count: number, random: RandomNumber = Math.random): number[]
{
	const order = Array.from({ length: count }, (_value, index) => index);

	for (let attempt = 0; attempt < 8; attempt++)
	{
		for (let index = order.length - 1; index > 0; index--)
		{
			const swapWith = Math.floor(random() * (index + 1));
			const held = order[index] as number;

			order[index] = order[swapWith] as number;
			order[swapWith] = held;
		}

		if (count < 2 || order.some((value, index) => value !== index)) return order;
	}

	// The random source kept answering the authored order; rotate by one instead.
	return order.map((_value, index) => (index + 1) % count);
}
