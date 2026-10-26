// Decides whether the renderer talks to the real bridge or the fake DojoApi. Pure, so it is unit tested.

/** Storage key that switches the data source at runtime (the e2e tests and `npm run dev` use it). */
export const DATA_SOURCE_STORAGE_KEY = "dojo.dataSource";

/** The fake's starting states. */
export const FAKE_SCENARIOS = ["returning", "fresh", "first-build-fails", "first-build-goes-quiet", "quests"] as const;

/** One fake starting state: a learner part way in, a learner who never ran setup, a setup whose first build fails once, a setup whose first build goes quiet (its progress and answer never arrive, A821), or the returning learner with the real Pack 1 World 1 open on the map (the quest screens' flow). */
export type FakeScenario = (typeof FAKE_SCENARIOS)[number];

/** Which data source to use. */
export type DataSourceChoice = { kind: "bridge" } | { kind: "fake"; scenario: FakeScenario };

/** Reads `fake` or `fake:<scenario>`; anything else means the real bridge. */
function parseChoice(value: string | null | undefined): DataSourceChoice | null
{
	if (!value) return null;

	const [kind, scenario] = value.trim().split(":");

	if (kind !== "fake") return null;

	const known = FAKE_SCENARIOS.find((candidate) => candidate === scenario);

	return { kind: "fake", scenario: known ?? "returning" };
}

/**
 * The stored runtime choice wins over the build-time `VITE_DOJO_FAKE` flag; with neither, the real bridge.
 * A packaged build always uses the real bridge, whatever is stored (A251).
 */
export function chooseDataSource(storedValue: string | null | undefined, buildFlag: string | null | undefined, isPackaged: boolean): DataSourceChoice
{
	if (isPackaged) return { kind: "bridge" };

	return parseChoice(storedValue) ?? parseChoice(buildFlag === "1" ? "fake" : buildFlag) ?? { kind: "bridge" };
}
