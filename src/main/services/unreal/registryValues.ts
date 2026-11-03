// Reads the string values out of what `reg query` prints, for the engine registry and the Windows SDK search.

/** Matches a `reg query` value line: four spaces, name, type, data. */
const VALUE_LINE = /^\s+(.+?)\s{4}REG_(?:EXPAND_)?SZ\s{4}(.*)$/;

/** The data of every string value in `reg query` output, in order; empty data is skipped. */
export function registryStringValues(output: string): string[]
{
	const values: string[] = [];

	for (const line of output.split(/\r?\n/))
	{
		const data = VALUE_LINE.exec(line)?.[2]?.trim();

		if (data) values.push(data);
	}

	return values;
}
