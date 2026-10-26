// The cache key of every query, so actions name what they make stale without typos.

/** Keys used by useDojoQuery. Actions invalidate by these (prefix match). */
export const QUERY_KEYS = {
	appVersion: "app-version",
	settings: "settings",
	environment: "environment",
	progress: "progress",
	rules: "rules",
	availability: "availability",
	testOut: "test-out",
	daily: "daily",
	drillSummary: "drill-summary",
	reviewProviders: "review-providers",
	engines: "engines",
	toolchain: "toolchain",
	packs: "packs",
	glossary: "glossary",
	patternCards: "pattern-cards",
	glossaryAliases: "glossary-aliases",
	quest: "quest",
	alternative: "alternative",
} as const;

/** A fixed query key. */
type FixedQueryKey = (typeof QUERY_KEYS)[keyof typeof QUERY_KEYS];

/** One query key: a fixed one, or one quest's key (`quest:<id>`, `alternative:<id>`), which invalidating its prefix also refreshes. */
export type QueryKey = FixedQueryKey | `${typeof QUERY_KEYS.quest}:${string}` | `${typeof QUERY_KEYS.alternative}:${string}`;

/** The key of one full quest. */
export function questKey(questId: string): QueryKey
{
	return `${QUERY_KEYS.quest}:${questId}`;
}

/** The key of one quest's alternative after a pass (A850). */
export function alternativeKey(questId: string): QueryKey
{
	return `${QUERY_KEYS.alternative}:${questId}`;
}
