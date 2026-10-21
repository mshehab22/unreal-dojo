// Hash router hooks: the current route, and a way to move to another one.
import { useCallback, useMemo, useSyncExternalStore } from "react";

import { hashForRoute, routeFromHash, routeParametersFromHash, type RouteDefinition, type RouteId, type RouteParameters } from "./routes";

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

/** The current hash's query parameters, such as the quest id; re-renders when they change. */
export function useRouteParameters(): RouteParameters
{
	const hash = useSyncExternalStore(subscribeToHash, readHash);

	return useMemo(() => routeParametersFromHash(hash), [hash]);
}

/** A function that moves the app to another route, with optional query parameters. */
export function useNavigate(): (id: RouteId, parameters?: RouteParameters) => void
{
	return useCallback((id: RouteId, parameters?: RouteParameters) =>
	{
		window.location.hash = hashForRoute(id, parameters);
	}, []);
}
