// Keeps the files stored on Submit attempts small, so "why is this a finding?" can read them without the save file growing without bound (A467).
import type { AttemptRecord } from "@shared/types/progress";

/** Longest single stored file, in characters (about 64 KB of source). */
export const MAXIMUM_STORED_FILE_LENGTH = 64 * 1024;

/** Most characters stored for one attempt, across its files (about 256 KB). */
export const MAXIMUM_STORED_ATTEMPT_LENGTH = 256 * 1024;

/** How many of a quest's latest attempts keep their files; older ones drop them. */
export const STORED_FILE_ATTEMPTS_PER_QUEST = 5;

/** Line added to a file cut at the per-file cap, so a reader knows the rest is missing. */
export const CUT_OFF_NOTE = "\n// (Unreal Dojo kept only the first 64 KB of this file.)";

/** Pure rules for the files kept on attempt records. */
export class AttemptFileRules
{
	/** Copies the files within the caps: each file cut at 64 KB (with a note), then files added by name until the attempt reaches 256 KB; the rest are left out. */
	capFiles(files: Record<string, string>): Record<string, string>
	{
		const kept: Record<string, string> = {};
		let total = 0;

		for (const name of Object.keys(files).sort())
		{
			const content = files[name] ?? "";
			const capped = content.length > MAXIMUM_STORED_FILE_LENGTH ? content.slice(0, MAXIMUM_STORED_FILE_LENGTH) + CUT_OFF_NOTE : content;

			if (total + capped.length > MAXIMUM_STORED_ATTEMPT_LENGTH) continue;

			kept[name] = capped;
			total += capped.length;
		}

		return kept;
	}

	/** Answers the attempts with files removed from all but the latest five of `questId`'s attempts that have files. Other quests are untouched. */
	pruneOlderFiles(attempts: readonly AttemptRecord[], questId: string): AttemptRecord[]
	{
		let keptForQuest = 0;
		const pruned = [...attempts];

		for (let index = pruned.length - 1; index >= 0; index--)
		{
			const attempt = pruned[index];
			if (!attempt || attempt.questId !== questId || attempt.files === undefined) continue;

			keptForQuest++;
			if (keptForQuest <= STORED_FILE_ATTEMPTS_PER_QUEST) continue;

			const { files: _dropped, ...withoutFiles } = attempt;
			pruned[index] = withoutFiles;
		}

		return pruned;
	}
}
