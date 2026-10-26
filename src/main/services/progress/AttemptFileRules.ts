// Keeps the files, reviews, and run results stored on Submit attempts small, so "why is this a finding?" and Retry review can read them without the save file growing without bound (A467, A604, A740).
import type { AttemptRecord } from "@shared/types/progress";
import type { RunResult } from "@shared/types/run";

import { keepForReview, MAXIMUM_COMPILER_OUTPUT_LENGTH, MAXIMUM_TEST_MESSAGE_LENGTH } from "../review/reviewInputLimits";

/** Longest single stored file, in characters (about 64 KB of source). */
export const MAXIMUM_STORED_FILE_LENGTH = 64 * 1024;

/** Most characters stored for one attempt, across its files (about 256 KB). */
export const MAXIMUM_STORED_ATTEMPT_LENGTH = 256 * 1024;

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

	/**
	 * Copies a run result keeping only what the review input reads (A740, A744, A746): each test message to one character past the review's cut,
	 * and the compiler output trimmed and, past the cut, ending in its next visible character (see `keepForReview`), so a retried review shows the
	 * same text and the same "(cut off)" mark as the first one. Everything else is kept as it is.
	 */
	capRun(run: RunResult): RunResult
	{
		const copy = structuredClone(run);
		copy.compilerOutput = keepForReview(copy.compilerOutput, MAXIMUM_COMPILER_OUTPUT_LENGTH, true);
		copy.tests = copy.tests.map((test) => (test.message === undefined ? test : { ...test, message: keepForReview(test.message, MAXIMUM_TEST_MESSAGE_LENGTH, false) }));

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

			// Explanations go with the review they explain (A851); the learner's reflection answer stays (A852).
			const { files: _droppedFiles, review: _droppedReview, run: _droppedRun, explanations: _droppedExplanations, ...summary } = attempt;
			pruned[index] = summary;
		}

		return pruned;
	}
}
