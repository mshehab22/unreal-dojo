// Follows the progress events of one long operation (sandbox setup or rebuild) by run id.
import { useEffect, useState } from "react";

import type { BuildProgressEvent } from "@shared/types/run";

import { dojo } from "./activeClient";

/** The latest progress event for `runId`, or null before the first one. Null run id means nothing to follow. */
export function useBuildProgress(runId: string | null): BuildProgressEvent | null
{
	const [latest, setLatest] = useState<BuildProgressEvent | null>(null);

	useEffect(() =>
	{
		setLatest(null);

		if (!runId) return;

		return dojo().onBuildProgress((event) =>
		{
			if (event.runId === runId) setLatest(event);
		});
	}, [runId]);

	return latest;
}
