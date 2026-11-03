// Orders `17.14.36301.6` style versions, for Visual Studio installs and Windows SDKs.

/** Compares two dotted versions part by part; a missing part counts as 0. Negative when left is older. */
export function compareDottedVersions(left: string, right: string): number
{
	const leftParts = left.split(".").map(Number);
	const rightParts = right.split(".").map(Number);

	for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index++)
	{
		const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
		if (difference !== 0) return difference;
	}

	return 0;
}
