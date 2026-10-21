// Refreshes what the visible screens read when the window comes back into focus, keeping the cached answers on screen meanwhile.
import { useEffect } from "react";

import { queryCache } from "./QueryCache";

/** Listens for window focus for as long as the calling component (the frame) is mounted. */
export function useRefetchOnFocus(): void
{
	useEffect(() =>
	{
		const onFocus = (): void => void queryCache.refetchObserved();

		window.addEventListener("focus", onFocus);

		return () => window.removeEventListener("focus", onFocus);
	}, []);
}
