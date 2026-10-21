// Hash router hooks: the current route, and a way to move to another one.
import { useCallback, useSyncExternalStore } from "react";

import { hashForRoute, routeFromHash, type RouteDefinition, type RouteId } from "./routes";

/** Calls back whenever the location hash changes. */
function subscribeToHash(onChange: () => void): () => void
{
	window.addEventListener("hashchange", onChange);

	return () => window.removeEventListener("hashchange", onChange);
}

/** Reads the current hash. */
function readHash(): string
{
	return window.location.hash;
}

/** The route matching the current location hash; re-renders when it changes. */
export function useRoute(): RouteDefinition
{
	const hash = useSyncExternalStore(subscribeToHash, readHash);

	return routeFromHash(hash);
}

/** A function that moves the app to another route. */
export function useNavigate(): (id: RouteId) => void
{
	return useCallback((id: RouteId) =>
	{
		window.location.hash = hashForRoute(id);
	}, []);
}
