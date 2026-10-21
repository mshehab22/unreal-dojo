// Reads one DojoClient answer through the shared cache and re-renders when it changes.
import { useCallback, useEffect, useSyncExternalStore } from "react";

import { dojo } from "./activeClient";
import type { DojoClient } from "./DojoClient";
import { queryCache, type QueryState } from "./QueryCache";
import type { QueryKey } from "./queryKeys";

/** A query's state plus a way to fetch it again. */
export interface QueryResult<Value> extends QueryState<Value>
{
	reload: () => void;
}

/** Fetches `load(client)` on mount (in the background when it is cached), shares the answer with every caller of the same key, and refreshes on invalidate and window focus. */
export function useDojoQuery<Value>(key: QueryKey, load: (client: DojoClient) => Promise<Value>): QueryResult<Value>
{
	const read = useCallback(() => queryCache.read<Value>(key), [key]);
	const state = useSyncExternalStore(queryCache.subscribe, read);

	useEffect(() =>
	{
		return queryCache.observe(key, () => load(dojo()));
		// The loader for a key never changes meaning, so only the key restarts the fetch.
	}, [key]);

	const reload = useCallback(() => void queryCache.fetch(key), [key]);

	return { ...state, reload };
}
