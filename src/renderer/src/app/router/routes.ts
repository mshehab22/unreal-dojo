// The app's routes and how a location hash maps to one. Pure data and functions, so unit tests can run them in Node.

/** Every screen the frame can show. */
export type RouteId = "title" | "studio" | "worldMap" | "character" | "codex" | "settings" | "devTokens";

/** One route: its id, hash path, and the label the navigation rail shows. */
export interface RouteDefinition
{
	readonly id: RouteId;
	readonly path: string;
	readonly label: string;
	readonly showInRail: boolean;
}

/** All routes, in rail order. The dev gallery is reachable by path only. */
export const ROUTES: readonly RouteDefinition[] = [
	{ id: "title", path: "/", label: "Title", showInRail: true },
	{ id: "studio", path: "/studio", label: "Studio", showInRail: true },
	{ id: "worldMap", path: "/world-map", label: "World Map", showInRail: true },
	{ id: "character", path: "/character", label: "Character", showInRail: true },
	{ id: "codex", path: "/codex", label: "Codex", showInRail: true },
	{ id: "settings", path: "/settings", label: "Settings", showInRail: true },
	{ id: "devTokens", path: "/dev/tokens", label: "Tokens", showInRail: false },
];

/** The route shown when the hash is empty or unknown. */
export const DEFAULT_ROUTE: RouteDefinition = ROUTES[0] as RouteDefinition;

/** Turns a location hash such as "#/studio" into its route; anything unknown falls back to the title screen. */
export function routeFromHash(hash: string): RouteDefinition
{
	const withoutMark = hash.startsWith("#") ? hash.slice(1) : hash;
	const path = withoutMark.split("?")[0] ?? "";
	const trimmed = path.length > 1 ? path.replace(/\/+$/, "") : path;

	return ROUTES.find((route) => route.path === trimmed) ?? DEFAULT_ROUTE;
}

/** The hash to set for a route id. */
export function hashForRoute(id: RouteId): string
{
	const route = ROUTES.find((candidate) => candidate.id === id) ?? DEFAULT_ROUTE;

	return `#${route.path}`;
}
