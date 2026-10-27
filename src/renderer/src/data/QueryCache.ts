// A tiny cache of DojoClient answers by key, so screens share one fetch and actions can ask for a refresh.
import type { AppError } from "@shared/types/errors";

import { toAppError } from "./toAppError";
import { waitLimitFor } from "./queryWaitLimits";

/** What a screen sees for one query: the last answer, the last error, and whether a fetch is running. */
export interface QueryState<Value>
{
	readonly data: Value | undefined;
	readonly error: AppError | undefined;
	readonly isLoading: boolean;
}

/** One cached query: its state, the loader that refreshes it, and how many mounted screens read it. */
interface CacheEntry
{
	state: QueryState<unknown>;
	load: () => Promise<unknown>;
	generation: number;
	observers: number;
}

/** The state of a key nobody asked for yet. Shared so useSyncExternalStore sees a stable value. */
const NOT_STARTED: QueryState<never> = { data: undefined, error: undefined, isLoading: true };

/** Builds the error a query shows when main has not answered within the key's wait limit (W12, A1250). */
export function noAnswerError(key: string, waitLimitMs: number): AppError
{
	return {
		code: "no-answer",
		message: "Unreal Dojo is taking too long to load this.",
		suggestedAction: "Try again. If it keeps happening, restart Unreal Dojo and report it with the details.",
		detail: `${key}: no answer from the main process after ${Math.round(waitLimitMs / 1000)} s`,
	};
}

/** Caches query answers by key and tells subscribers when any of them change. */
export class QueryCache
{
	private readonly entries = new Map<string, CacheEntry>();
	private readonly listeners = new Set<() => void>();

	/** Takes the wait limit per key; tests pass a short one. */
	constructor(private readonly waitLimitOf: (key: string) => number = waitLimitFor)
	{}

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

	/**
	 * A screen starts reading a key: the first time it fetches, later it refetches in the background while the cached answer stays visible.
	 * Returns the function to call when the screen stops reading it.
	 */
	observe(key: string, load: () => Promise<unknown>): () => void
	{
		const entry = this.entries.get(key) ?? { state: NOT_STARTED, load, generation: 0, observers: 0 };

		entry.load = load;
		entry.observers += 1;
		this.entries.set(key, entry);
		void this.fetch(key);

		return () =>
		{
			entry.observers = Math.max(0, entry.observers - 1);
		};
	}

	/** Refetches every key a mounted screen is reading, in the background (on window focus). */
	refetchObserved(): Promise<void[]>
	{
		const keys = [...this.entries.entries()].filter(([, entry]) => entry.observers > 0).map(([key]) => key);

		return Promise.all(keys.map((key) => this.fetch(key)));
	}

	/**
	 * Fetches a key again, keeping the old answer visible meanwhile. When main has not answered within the key's wait limit, the query
	 * stops loading with the `no-answer` error (a screen shows it with a retry) and this resolves; an answer that comes later still lands (A1250).
	 */
	async fetch(key: string): Promise<void>
	{
		const entry = this.entries.get(key);

		if (!entry) return;

		entry.generation += 1;
		const generation = entry.generation;
		this.update(entry, { ...entry.state, isLoading: true });

		const waitLimitMs = this.waitLimitOf(key);
		let giveUpTimer: ReturnType<typeof setTimeout> | undefined;
		const gaveUp = new Promise<void>((resolve) =>
		{
			giveUpTimer = setTimeout(() =>
			{
				if (generation === entry.generation && entry.state.isLoading) this.update(entry, { data: entry.state.data, error: noAnswerError(key, waitLimitMs), isLoading: false });
				resolve();
			}, waitLimitMs);
		});

		try
		{
			await Promise.race([this.loadInto(entry, generation), gaveUp]);
		}
		finally
		{
			clearTimeout(giveUpTimer);
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

	/** Runs the entry's loader and stores its answer or its error, unless a newer fetch of the key started meanwhile. Never rejects. */
	private async loadInto(entry: CacheEntry, generation: number): Promise<void>
	{
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
