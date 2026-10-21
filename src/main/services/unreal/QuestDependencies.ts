// Reads which earlier quests a quest compiles against, from the one brief line content uses for it (A268).

/** The brief line that declares cross-quest file dependencies. */
const DEPENDENCY_LINE = /^Compiles against earlier quests:(.*)$/m;

/** A quest folder path inside that line, for example `Quests/f1-training-dummy/DojoF1TrainingDummy.h`. */
const QUEST_PATH = /Quests\/([a-z0-9][a-z0-9-]*)\//g;

/** Quest ids named on the brief's "Compiles against earlier quests:" line, in order and without repeats. Empty when the brief has no such line. */
export function prerequisiteQuestIds(brief: string): string[]
{
	const line = DEPENDENCY_LINE.exec(brief)?.[1];
	if (line === undefined) return [];

	return [...new Set([...line.matchAll(QUEST_PATH)].map((match) => match[1] ?? ""))].filter((questId) => questId.length > 0);
}
