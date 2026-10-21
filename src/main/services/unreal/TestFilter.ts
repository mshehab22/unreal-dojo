// Works out which automation tests belong to a quest from the quest's own test source.

/** The test name inside `IMPLEMENT_SIMPLE_AUTOMATION_TEST(Class, "Name", Flags)` and the complex and custom variants. */
const TEST_NAME = /IMPLEMENT_\w*AUTOMATION_TEST\w*\s*\(\s*\w+\s*,\s*"([^"]+)"/g;

/** Every test name declared in a quest's test source, in order. */
export function declaredTestNames(testSource: string): string[]
{
	return [...testSource.matchAll(TEST_NAME)].map((match) => match[1] ?? "").filter((name) => name.length > 0);
}

/** The `Automation RunTests` argument for these tests: each name anchored at the start with `^`, closed with `endAnchor` (`$` where the platform allows it), joined with `+`. Unanchored names are substring matches, so `Dojo.W1.Health` would also run `Dojo.W1.HealthBar` tests (A180). */
export function anchoredTestFilter(testNames: string[], endAnchor: string): string
{
	return testNames.map((name) => `^${name}${endAnchor}`).join("+");
}
