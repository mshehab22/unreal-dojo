// Works out which automation tests belong to a quest from the quest's own test source.

/** The test name inside `IMPLEMENT_SIMPLE_AUTOMATION_TEST(Class, "Name", Flags)` and the complex and custom variants. */
const TEST_NAME = /IMPLEMENT_\w*AUTOMATION_TEST\w*\s*\(\s*\w+\s*,\s*"([^"]+)"/g;

/** Every test name declared in a quest's test source, in order. */
export function declaredTestNames(testSource: string): string[]
{
	return [...testSource.matchAll(TEST_NAME)].map((match) => match[1] ?? "").filter((name) => name.length > 0);
}

/** The `RunTests` filter for a quest: the longest dotted prefix every declared test shares, for example `Dojo.W1.HealthComponent` (A180). Null when the source declares no test. */
export function questTestFilter(testSource: string): string | null
{
	const names = declaredTestNames(testSource);
	if (names.length === 0) return null;

	if (names.length === 1) return names[0] ?? null;

	const splitNames = names.map((name) => name.split("."));
	const shared: string[] = [];

	for (let index = 0; ; index++)
	{
		const part = splitNames[0]?.[index];

		if (part === undefined || !splitNames.every((parts) => parts[index] === part)) break;

		shared.push(part);
	}

	return shared.length > 0 ? shared.join(".") : null;
}
