// Which terms can gate a quest or a world's test-out: only terms some concept quest teaches (A312, A322), and only when that concept quest comes earlier in course order (A72, A660).
import type { RuleQuest } from "./RuleQuest";

/** Negative when `left` comes before `right` in course order: earlier pack, then earlier world, then lower order in the world. */
export function compareCourseOrder(left: RuleQuest, right: RuleQuest): number
{
	return left.packOrder - right.packOrder || left.worldOrder - right.worldOrder || left.order - right.order;
}

/** The earliest concept quest (in course order) that teaches each term. */
export function firstTeachersOf(quests: RuleQuest[]): Map<string, RuleQuest>
{
	const teachers = new Map<string, RuleQuest>();

	for (const quest of quests.filter((candidate) => candidate.kind === "concept"))
	{
		for (const term of quest.terms)
		{
			const current = teachers.get(term);
			if (!current || compareCourseOrder(quest, current) < 0) teachers.set(term, quest);
		}
	}

	return teachers;
}

/** The terms of `quest` that a concept quest teaches before it in course order. A concept quest's own terms never gate it. */
export function gatingTermsOf(quest: RuleQuest, teachers: Map<string, RuleQuest>): string[]
{
	if (quest.kind === "concept") return [];

	return quest.terms.filter((term) =>
	{
		const teacher = teachers.get(term);

		return teacher !== undefined && compareCourseOrder(teacher, quest) < 0;
	});
}

/** The terms of a world's quests that a concept quest teaches in that world or an earlier one: the world's test-out terms (A322, A660). */
export function testOutTermsOf(quests: RuleQuest[], worldId: string): string[]
{
	const teachers = firstTeachersOf(quests);
	const worldQuests = quests.filter((quest) => quest.worldId === worldId);
	const anchor = worldQuests[0];
	if (!anchor) return [];

	return [...new Set(worldQuests.flatMap((quest) => quest.terms))].filter((term) =>
	{
		const teacher = teachers.get(term);

		return teacher !== undefined && (teacher.packOrder < anchor.packOrder || (teacher.packOrder === anchor.packOrder && teacher.worldOrder <= anchor.worldOrder));
	});
}
