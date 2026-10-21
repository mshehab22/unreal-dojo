// Runs one DojoClient call that changes something, tracks it, and refreshes the queries it made stale.
import { useCallback, useState } from "react";

import type { AppError } from "@shared/types/errors";

import { dojo } from "./activeClient";
import type { DojoClient } from "./DojoClient";
import { queryCache } from "./QueryCache";
import type { QueryKey } from "./queryKeys";
import { toAppError } from "./toAppError";

/** An action's runner and its state. `run` resolves with the answer, or undefined when it failed (the error is in `error`). */
export interface ActionHandle<Arguments extends unknown[], Value>
{
	run: (...actionArguments: Arguments) => Promise<Value | undefined>;
	isPending: boolean;
	error: AppError | undefined;
	clearError: () => void;
}

/** Wraps a mutating call: sets pending, catches the AppError, then invalidates the given query keys. */
export function useDojoAction<Arguments extends unknown[], Value>(
	action: (client: DojoClient, ...actionArguments: Arguments) => Promise<Value>,
	invalidates: readonly QueryKey[] = [],
): ActionHandle<Arguments, Value>
{
	const [isPending, setPending] = useState(false);
	const [error, setError] = useState<AppError | undefined>(undefined);

	const run = useCallback(async (...actionArguments: Arguments): Promise<Value | undefined> =>
	{
		setPending(true);
		setError(undefined);

		try
		{
			const value = await action(dojo(), ...actionArguments);
			await queryCache.invalidate(invalidates);
			return value;
		}
		catch (thrown)
		{
			setError(toAppError(thrown));
			return undefined;
		}
		finally
		{
			setPending(false);
		}
		// Callers pass inline arrows; the action's meaning does not change between renders.
	}, invalidates);

	const clearError = useCallback(() => setError(undefined), []);

	return { run, isPending, error, clearError };
}
