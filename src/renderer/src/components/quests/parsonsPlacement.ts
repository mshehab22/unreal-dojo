// Which placed Parsons lines are wrong after checking: decoys always, and real lines outside the longest run that already reads in order.

/** Line ids judged wrong: every decoy (`distractor-*`), plus every real line not in the longest common subsequence of the placed lines (decoys removed) and the block's lines. Lines are compared by text, so identical lines are interchangeable (A314). */
export function misplacedLineIds(order: readonly string[], textOf: (lineId: string) => string | undefined, blockLines: readonly string[]): Set<string>
{
	const wrong = new Set(order.filter((lineId) => lineId.startsWith("distractor-")));
	const real = order.filter((lineId) => !wrong.has(lineId));
	const texts = real.map((lineId) => textOf(lineId) ?? "");

	// lengths[i][j]: longest common subsequence of texts[i..] and blockLines[j..].
	const lengths = Array.from({ length: texts.length + 1 }, () => new Array<number>(blockLines.length + 1).fill(0));

	for (let i = texts.length - 1; i >= 0; i--)
	{
		for (let j = blockLines.length - 1; j >= 0; j--)
		{
			const row = lengths[i] as number[];
			row[j] = texts[i] === blockLines[j] ? (lengths[i + 1]?.[j + 1] ?? 0) + 1 : Math.max(lengths[i + 1]?.[j] ?? 0, row[j + 1] ?? 0);
		}
	}

	// Walk the table to mark the lines that are part of the in-order run.
	const kept = new Set<number>();
	let i = 0;
	let j = 0;

	while (i < texts.length && j < blockLines.length)
	{
		if (texts[i] === blockLines[j])
		{
			kept.add(i);
			i += 1;
			j += 1;
		}
		else if ((lengths[i + 1]?.[j] ?? 0) >= (lengths[i]?.[j + 1] ?? 0))
		{
			i += 1;
		}
		else
		{
			j += 1;
		}
	}

	real.forEach((lineId, index) =>
	{
		if (!kept.has(index)) wrong.add(lineId);
	});

	return wrong;
}
