// Keeps the files, reviews, and run results stored on Submit attempts small, so "why is this a finding?" and Retry review can read them without the save file growing without bound (A467, A604, A740).
import type { AttemptRecord } from "@shared/types/progress";
import type { RunResult } from "@shared/types/run";

/** Longest single stored file, in characters (about 64 KB of source). */
export const MAXIMUM_STORED_FILE_LENGTH = 64 * 1024;

/** Most characters stored for one attempt, across its files (about 256 KB). */
export const MAXIMUM_STORED_ATTEMPT_LENGTH = 256 * 1024;

/** Longest stored compiler output, in characters: the same cut the review input makes, so a retried review reads what the first one read. */
export const MAXIMUM_STORED_COMPILER_OUTPUT_LENGTH = 8000;

/** Longest stored test message, in characters. */
export const MAXIMUM_STORED_TEST_MESSAGE_LENGTH = 1000;

/** How many of a quest's latest attempts keep their files, code review, and run result; older ones keep only score, pass, and XP. */
export const STORED_DETAIL_ATTEMPTS_PER_QUEST = 5;

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

	/** Copies a run result with its compiler output cut at 8000 characters and each test message at 1000; everything else is kept as it is (A740). */
	capRun(run: RunResult): RunResult
	{
		const copy = structuredClone(run);
		copy.compilerOutput = copy.compilerOutput.slice(0, MAXIMUM_STORED_COMPILER_OUTPUT_LENGTH);
		copy.tests = copy.tests.map((test) => (test.message !== undefined && test.message.length > MAXIMUM_STORED_TEST_MESSAGE_LENGTH ? { ...test, message: test.message.slice(0, MAXIMUM_STORED_TEST_MESSAGE_LENGTH) } : test));

		return copy;
	}

	/** Answers the attempts with files, reviews, and run results removed from all but the latest five of `questId`'s attempts that hold any. Other quests are untouched (A467, A604, A740). */
	pruneOlderDetails(attempts: readonly AttemptRecord[], questId: string): AttemptRecord[]
	{
		let keptForQuest = 0;
		const pruned = [...attempts];

		for (let index = pruned.length - 1; index >= 0; index--)
		{
			const attempt = pruned[index];
			if (!attempt || attempt.questId !== questId || (attempt.files === undefined && attempt.review === undefined && attempt.run === undefined)) continue;

			keptForQuest++;
			if (keptForQuest <= STORED_DETAIL_ATTEMPTS_PER_QUEST) continue;

			const { files: _droppedFiles, review: _droppedReview, run: _droppedRun, ...summary } = attempt;
			pruned[index] = summary;
		}

		return pruned;
	}
}
