// Decides which build and test log lines matter to the learner, and reads progress from them.

/** Matches a compiler or engine error or warning. */
const ERROR_OR_WARNING = /\b(error|warning)\b/i;

/** Matches a path inside the learner's quest code or the quest tests, with either slash. */
const QUEST_OR_TEST_PATH = /(^|[\\/])(Quests|Tests)[\\/]/;

/** `@progress 'Compiling C++ source code...' 45%` from UBT's `-Progress` flag. */
const PROGRESS_PERCENT = /^@progress\b.*?(\d{1,3})%/;

/** `[3/10] Compile [Apple] File.cpp`: one action of N. */
const ACTION_COUNT = /^\[(\d+)\/(\d+)\]/;

/** Keeps errors, warnings, and lines about `Quests/` or `Tests/`; drops the rest of UBT's chatter. */
export class LogFilter
{
	/** True when the line belongs in the compiler output the learner sees. */
	keep(line: string): boolean
	{
		if (line.startsWith("@progress")) return false;

		return ERROR_OR_WARNING.test(line) || QUEST_OR_TEST_PATH.test(line);
	}

	/** Rough build completion from 0 to 100 when the line tells it, else null. */
	progressPercent(line: string): number | null
	{
		const progress = PROGRESS_PERCENT.exec(line);
		if (progress) return Math.min(100, Number(progress[1]));

		const actions = ACTION_COUNT.exec(line);
		if (actions && Number(actions[2]) > 0) return Math.min(100, Math.round((Number(actions[1]) / Number(actions[2])) * 100));

		return null;
	}

	/** Keeps the kept lines of a whole log, joined with newlines. */
	filterAll(lines: string[]): string
	{
		return lines.filter((line) => this.keep(line)).join("\n");
	}
}
