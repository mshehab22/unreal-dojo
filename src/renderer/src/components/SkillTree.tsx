// The skill tree: one branch per skill prefix, drawn as inline SVG, each node colored by mastery.
import type { MasteryLevel } from "@shared/types/progress";

import type { SkillGroup } from "@/lib/skillGroups";

/** Props for SkillTree. */
interface SkillTreeProps
{
	readonly groups: readonly SkillGroup[];
}

/** Opacity of the pack accent for each mastery level; mastered nodes are solid. */
const MASTERY_OPACITY: Readonly<Record<MasteryLevel, number>> = {
	attempted: 0.22,
	familiar: 0.45,
	proficient: 0.75,
	mastered: 1,
};

/** Every mastery level, lowest first, for the legend. */
const MASTERY_LEVELS: readonly MasteryLevel[] = ["attempted", "familiar", "proficient", "mastered"];

const ROW_HEIGHT = 30;
const BRANCH_WIDTH = 210;

/** Draws one branch: a trunk down the left with a node and label per skill. */
function Branch({ group }: { readonly group: SkillGroup })
{
	const height = 34 + group.skills.length * ROW_HEIGHT;

	return (
		<svg width={BRANCH_WIDTH} height={height} viewBox={`0 0 ${BRANCH_WIDTH} ${height}`} role="img" aria-label={`${group.prefix} skills`} className="shrink-0 overflow-visible">
			<text x="0" y="12" className="fill-paper-faint font-mono text-[10px] tracking-widest uppercase">
				{group.prefix}
			</text>
			<line x1="8" y1="22" x2="8" y2={height - ROW_HEIGHT / 2 + 2} className="stroke-line-strong" strokeWidth="1.5" />
			{group.skills.map((skill, index) =>
			{
				const y = 34 + index * ROW_HEIGHT + ROW_HEIGHT / 2 - 6;

				return (
					<g key={skill.id} data-testid="skill-node" data-mastery={skill.mastery}>
						<title>{`${skill.id}: ${skill.mastery}, ${skill.points} points`}</title>
						<line x1="8" y1={y} x2="20" y2={y} className="stroke-line-strong" strokeWidth="1.5" />
						<circle cx="27" cy={y} r="7" className="fill-pack stroke-pack" fillOpacity={MASTERY_OPACITY[skill.mastery]} strokeWidth="1.5" />
						<text x="42" y={y + 4} className="fill-paper text-[12px]">
							{skill.label}
						</text>
						<text x={BRANCH_WIDTH - 4} y={y + 4} textAnchor="end" className="fill-paper-faint font-mono text-[10px]">
							{skill.mastery}
						</text>
					</g>
				);
			})}
		</svg>
	);
}

/** Every branch side by side, wrapping, with a mastery legend. Mastery that slipped reads as "due for review", never as a loss. */
export function SkillTree({ groups }: SkillTreeProps)
{
	if (groups.length === 0) return <p className="text-sm text-paper-faint">Skills appear here after your first quest.</p>;

	return (
		<div data-testid="skill-tree" className="flex flex-col gap-4">
			<div className="flex flex-wrap gap-x-10 gap-y-6">
				{groups.map((group) => (
					<Branch key={group.prefix} group={group} />
				))}
			</div>
			<div className="flex flex-wrap items-center gap-4 text-2xs text-paper-faint">
				{MASTERY_LEVELS.map((level) => (
					<span key={level} className="flex items-center gap-1.5">
						<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
							<circle cx="5" cy="5" r="4" className="fill-pack stroke-pack" fillOpacity={MASTERY_OPACITY[level]} />
						</svg>
						{level}
					</span>
				))}
				<span>Mastery can slip on a missed drill; it comes back with review.</span>
			</div>
		</div>
	);
}
