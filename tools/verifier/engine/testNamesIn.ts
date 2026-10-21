// Finds the automation test names a quest's test source declares, so results can be matched back to the quest.

/** Matches `IMPLEMENT_SIMPLE_AUTOMATION_TEST(FClass, "Dojo.World.Quest.Case", ...)` and the complex and custom variants. */
const TEST_MACRO_PATTERN = /IMPLEMENT_(?:CUSTOM_)?(?:SIMPLE|COMPLEX)_AUTOMATION_TEST\s*\(\s*\w+\s*,\s*(?:\w+\s*,\s*)?"([^"]+)"/g;

/** Every test name declared in `source`, in order. */
export function testNamesIn(source: string): string[]
{
	return [...source.matchAll(TEST_MACRO_PATTERN)].map((match) => match[1] ?? "").filter((name) => name !== "");
}
