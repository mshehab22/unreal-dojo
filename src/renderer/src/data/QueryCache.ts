// A tiny cache of DojoClient answers by key, so screens share one fetch and actions can ask for a refresh.
import type { AppError } from "@shared/types/errors";

import { toAppError } from "./toAppError";

/** What a screen sees for one query: the last answer, the last error, and whether a fetch is running. */
export interface QueryState<Value>
{
	readonly data: Value | undefined;
	readonly error: AppError | undefined;
	readonly isLoading: boolean;
}

/** One cached query: its state and the loader that refreshes it. */
interface CacheEntry
{
	state: QueryState<unknown>;
	load: () => Promise<unknown>;
	generation: number;
}

/** The state of a key nobody asked for yet. Shared so useSyncExternalStore sees a stable value. */
const NOT_STARTED: QueryState<never> = { data: undefined, error: undefined, isLoading: true };

/** Caches query answers by key and tells subscribers when any of them change. */
export class QueryCache
{
	private readonly entries = new Map<string, CacheEntry>();
	private readonly listeners = new Set<() => void>();

	/** Adds a change listener and returns the function that removes it. */
	subscribe = (listener: () => void): (() => void) =>
	{
		this.listeners.add(listener);

		return () => this.listeners.delete(listener);
	};

	/** The current state of a key; the same object until it changes. */
	read<Value>(key: string): QueryState<Value>
	{
		return (this.entries.get(key)?.state ?? NOT_STARTED) as QueryState<Value>;
	}

	/** Starts the first fetch of a key; does nothing when it was fetched before. */
	ensure(key: string, load: () => Promise<unknown>): void
	{
		const existing = this.entries.get(key);

		if (existing)
		{
			existing.load = load;
			return;
		}

		this.entries.set(key, { state: NOT_STARTED, load, generation: 0 });
		void this.fetch(key);
	}

	/** Fetches a key again, keeping the old answer visible meanwhile. */
	async fetch(key: string): Promise<void>
	{
		const entry = this.entries.get(key);

		if (!entry) return;

		entry.generation += 1;
		const generation = entry.generation;
		this.update(entry, { ...entry.state, isLoading: true });

		try
		{
			const data = await entry.load();

			if (generation === entry.generation) this.update(entry, { data, error: undefined, isLoading: false });
		}
		catch (thrown)
		{
			if (generation === entry.generation) this.update(entry, { data: entry.state.data, error: toAppError(thrown), isLoading: false });
		}
	}

	/** Refreshes every cached key that starts with one of the prefixes. */
	invalidate(prefixes: readonly string[]): Promise<void[]>
	{
		const keys = [...this.entries.keys()].filter((key) => prefixes.some((prefix) => key.startsWith(prefix)));

		return Promise.all(keys.map((key) => this.fetch(key)));
	}

	/** Forgets everything, for tests and a data source switch. */
	clear(): void
	{
		this.entries.clear();
		this.notify();
	}

	/** Replaces an entry's state and tells the listeners. */
	private update(entry: CacheEntry, state: QueryState<unknown>): void
	{
		entry.state = state;
		this.notify();
	}

	/** Calls every listener. */
	private notify(): void
	{
		for (const listener of this.listeners) listener();
	}
}

/** The app's one cache. */
export const queryCache = new QueryCache();
