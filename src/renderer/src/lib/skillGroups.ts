// Groups skill ids by their two-part prefix (ue.objects, patterns.lens) for the skill tree.
import type { MasteryLevel } from "@shared/types/progress";

/** One skill as the tree draws it. */
export interface SkillNode
{
	id: string;
	label: string;
	points: number;
	mastery: MasteryLevel;
}

/** One branch of the tree: a prefix and its skills. */
export interface SkillGroup
{
	prefix: string;
	skills: SkillNode[];
}

/** The prefix a skill belongs to: its first two dot parts, or the first when there is only one more. */
export function skillPrefix(skillId: string): string
{
	const parts = skillId.split(".");

	return parts.length > 2 ? parts.slice(0, 2).join(".") : (parts[0] ?? skillId);
}

/** Groups skills by prefix, prefixes and skills sorted by name. */
export function groupSkills(skills: Record<string, { points: number; mastery: MasteryLevel }>): SkillGroup[]
{
	const groups = new Map<string, SkillNode[]>();

	for (const [id, skill] of Object.entries(skills))
	{
		const prefix = skillPrefix(id);
		const label = id.slice(prefix.length + 1) || id;
		const list = groups.get(prefix) ?? [];

		list.push({ id, label, points: skill.points, mastery: skill.mastery });
		groups.set(prefix, list);
	}

	return [...groups.entries()]
		.sort(([first], [second]) => first.localeCompare(second))
		.map(([prefix, list]) => ({ prefix, skills: list.sort((first, second) => first.label.localeCompare(second.label)) }));
}
