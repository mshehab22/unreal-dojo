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
} as const;

/** One query key. */
export type QueryKey = (typeof QUERY_KEYS)[keyof typeof QUERY_KEYS];
