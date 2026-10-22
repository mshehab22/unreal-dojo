// Runs one sandbox create or rebuild for a screen through a SandboxBuildTracker, which recovers lost events and lost answers (A822).
import { useCallback, useEffect, useRef, useState } from "react";

import type { SandboxSetupResult } from "@shared/types/engine";

import { dojo } from "./activeClient";
import type { DojoClient } from "./DojoClient";
import { queryCache } from "./QueryCache";
import { QUERY_KEYS } from "./queryKeys";
import { SandboxBuildTracker, type SandboxBuildContext, type SandboxBuildSnapshot, type SandboxBuildStatus } from "./SandboxBuildTracker";

export type { SandboxBuildStatus };

/** The build's state and controls. */
export interface SandboxBuild extends SandboxBuildSnapshot
{
	start: () => void;
	cancel: () => void;
	checkStatus: () => void;
}

/** Wraps `operation(client, runId)` (createSandbox on first run, rebuildSandbox in Settings) as a startable, cancellable, self-checking build. */
export function useSandboxBuild(operation: (client: DojoClient, runId: string) => Promise<SandboxSetupResult>, context: SandboxBuildContext): SandboxBuild
{
	const trackerReference = useRef<SandboxBuildTracker | null>(null);
	const [snapshot, setSnapshot] = useState<SandboxBuildSnapshot | null>(null);

	// One tracker for the component's life; the operation is fixed for it too.
	trackerReference.current ??= new SandboxBuildTracker(dojo(), (runId) => operation(dojo(), runId), (next) =>
	{
		setSnapshot(next);

		if (next.status === "succeeded" || next.status === "failed") void queryCache.invalidate([QUERY_KEYS.settings, QUERY_KEYS.environment]);
	}, context);

	const tracker = trackerReference.current;

	useEffect(() => () => tracker.dispose(), [tracker]);

	const start = useCallback(() => tracker.start(), [tracker]);
	const cancel = useCallback(() => tracker.cancel(), [tracker]);
	const checkStatus = useCallback(() => void tracker.checkStatus(), [tracker]);

	return { ...(snapshot ?? tracker.current()), start, cancel, checkStatus };
}
