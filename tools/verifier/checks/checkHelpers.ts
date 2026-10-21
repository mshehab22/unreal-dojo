// Small helpers every verifier check shares: making problems and picking quest groups.
import type { ContentProblem } from "../../../src/shared/types/content";
import type { QuestRecord, VerifierInput } from "../ContentCheck";

/** An error about `file`, in `section` when given. */
export function errorAt(file: string, message: string, section?: string): ContentProblem
{
	return section === undefined ? { file, message } : { file, section, message };
}

/** A warning about `file`, in `section` when given. Warnings do not fail the verifier. */
export function warningAt(file: string, message: string, section?: string): ContentProblem
{
	return { ...errorAt(file, message, section), severity: "warning" };
}

/** Quests that belong to a pack (the curriculum), leaving the format examples out. */
export function packQuests(input: VerifierInput): QuestRecord[]
{
	return input.quests.filter((record) => record.packId !== undefined);
}

/** A list of ids for a message, cut after `limit` with a count of the rest. */
export function listIds(ids: readonly string[], limit: number = 12): string
{
	const shown = ids.slice(0, limit).join(", ");

	return ids.length > limit ? `${shown}, and ${ids.length - limit} more` : shown;
}

/** The folder part of a content-relative path (`packs/p1/worlds/01-a/02-b.md` gives `packs/p1/worlds/01-a`). */
export function folderOf(file: string): string
{
	const cut = file.lastIndexOf("/");

	return cut < 0 ? "" : file.slice(0, cut);
}
