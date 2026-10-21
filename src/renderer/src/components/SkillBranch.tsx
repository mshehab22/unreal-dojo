// One branch of the skill tree: the group name, a trunk, and a node with a readable label and mastery name per skill.
import type { SkillGroup } from "@/lib/skillGroups";
import { MASTERY_NAMES, skillGroupName, skillLabel } from "@/lib/skillNames";

import { MasteryGlyph } from "./MasteryGlyph";

/** Props for SkillBranch. */
interface SkillBranchProps
{
	readonly group: SkillGroup;
}

const ROW_HEIGHT = 30;
const BRANCH_WIDTH = 220;

/** Draws one branch as inline SVG. */
export function SkillBranch({ group }: SkillBranchProps)
{
	const height = 34 + group.skills.length * ROW_HEIGHT;
	const name = skillGroupName(group.prefix);

	return (
		<svg width={BRANCH_WIDTH} height={height} viewBox={`0 0 ${BRANCH_WIDTH} ${height}`} role="img" aria-label={`${name} skills`} className="shrink-0 overflow-visible">
			<text x="0" y="12" className="fill-paper-faint font-mono text-[10px] tracking-widest uppercase">
				{name}
			</text>
			<line x1="8" y1="22" x2="8" y2={height - ROW_HEIGHT / 2 + 2} className="stroke-line-strong" strokeWidth="1.5" />
			{group.skills.map((skill, index) =>
			{
				const y = 34 + index * ROW_HEIGHT + ROW_HEIGHT / 2 - 6;

				return (
					<g key={skill.id} data-testid="skill-node" data-mastery={skill.mastery}>
						<title>{`${skillLabel(skill.label)}: ${MASTERY_NAMES[skill.mastery]}, ${skill.points} points`}</title>
						<line x1="8" y1={y} x2="20" y2={y} className="stroke-line-strong" strokeWidth="1.5" />
						<MasteryGlyph mastery={skill.mastery} cx={27} cy={y} radius={7} />
						<text x="42" y={y + 4} className="fill-paper text-[12px]">
							{skillLabel(skill.label)}
						</text>
						<text x={BRANCH_WIDTH - 4} y={y + 4} textAnchor="end" className="fill-paper-faint text-[11px]">
							{MASTERY_NAMES[skill.mastery]}
						</text>
					</g>
				);
			})}
		</svg>
	);
}
