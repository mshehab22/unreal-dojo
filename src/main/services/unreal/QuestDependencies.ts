// Reads which earlier quests a quest compiles against, from the one brief line content uses for it (A268, A407).

/** The brief line that declares cross-quest file dependencies. */
const DEPENDENCY_LINE = /^Compiles against earlier quests:(.*)$/m;

/** Escapes a quest id for use inside a regular expression. */
function escapeForPattern(text: string): string
{
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Every known quest id that appears on the brief's "Compiles against earlier quests:" line as a whole word, in order of first appearance. So "f1-popup-target as extended by f1-boss-training-yard" yields both. Empty when the brief has no such line. */
export function prerequisiteQuestIds(brief: string, knownQuestIds: string[]): string[]
{
	const line = DEPENDENCY_LINE.exec(brief)?.[1];
	if (line === undefined) return [];

	const found: { questId: string; position: number }[] = [];

	for (const questId of knownQuestIds)
	{
		const match = new RegExp(`(?<![a-z0-9-])${escapeForPattern(questId)}(?![a-z0-9-])`).exec(line);
		if (match) found.push({ questId, position: match.index });
	}

	return found.sort((left, right) => left.position - right.position).map((entry) => entry.questId);
}
