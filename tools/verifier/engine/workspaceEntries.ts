// Small helpers the verify workspace code shares for reading folders and recognising quest ids (W16).
import { readdir } from "node:fs/promises";

/** A quest id as QuestFileWriter accepts it, so a stray folder or parked folder with any other name is never taken for a quest. */
export const QUEST_ID = /^[a-z0-9][a-z0-9-]*$/;

/** Names of the entries in `folder` that `wanted` accepts, or none when it is missing. */
export async function entryNames(folder: string, wanted: (entry: { name: string; isFile(): boolean; isDirectory(): boolean }) => boolean): Promise<string[]>
{
	return (await readdir(folder, { withFileTypes: true }).catch(() => [])).filter(wanted).map((entry) => entry.name);
}
