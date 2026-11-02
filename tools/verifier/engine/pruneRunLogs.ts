// Keeps only the newest few run folders under a workspace's `Saved/VerifierLogs`, so failure logs stay available without growing without end (W14, A1283).
import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";

/** Removes all but the newest `keep` run folders in `logsRoot`; run folders are named by a sortable stamp, files and other entries are left alone. */
export async function pruneRunLogs(logsRoot: string, keep: number): Promise<string[]>
{
	const runs = (await readdir(logsRoot, { withFileTypes: true }).catch(() => [])).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
	const doomed = runs.slice(0, Math.max(0, runs.length - keep));

	for (const name of doomed) await rm(join(logsRoot, name), { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });

	return doomed;
}
