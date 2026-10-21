// The terms some concept quest teaches. Only these can gate a quest or a world's test-out (A312, A322).
import type { RuleQuest } from "./RuleQuest";

/** Every term listed by a concept quest. */
export function taughtTermsOf(quests: RuleQuest[]): Set<string>
{
	return new Set(quests.filter((quest) => quest.kind === "concept").flatMap((quest) => quest.terms));
}
