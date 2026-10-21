// The skill tree: one branch per skill prefix, each skill's mastery drawn as a distinct shape (A250).
import type { MasteryLevel } from "@shared/types/progress";

import type { SkillGroup } from "@/lib/skillGroups";
import { MASTERY_NAMES } from "@/lib/skillNames";

import { MasteryGlyph } from "./MasteryGlyph";
import { SkillBranch } from "./SkillBranch";

/** Props for SkillTree. */
interface SkillTreeProps
{
	readonly groups: readonly SkillGroup[];
}

/** Every mastery level, lowest first, for the legend. */
const MASTERY_LEVELS: readonly MasteryLevel[] = ["attempted", "familiar", "proficient", "mastered"];

/** Every branch side by side, wrapping, with a mastery legend. Mastery that slipped reads as "due for review", never as a loss. */
export function SkillTree({ groups }: SkillTreeProps)
{
	if (groups.length === 0) return <p className="text-sm text-paper-faint">Skills appear here after your first quest.</p>;

	return (
		<div data-testid="skill-tree" className="flex flex-col gap-4">
			<div className="flex flex-wrap gap-x-10 gap-y-6">
				{groups.map((group) => (
					<SkillBranch key={group.prefix} group={group} />
				))}
			</div>
			<div className="flex flex-wrap items-center gap-4 text-2xs text-paper-faint">
				{MASTERY_LEVELS.map((level) => (
					<span key={level} className="flex items-center gap-1.5">
						<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
							<MasteryGlyph mastery={level} cx={7} cy={7} radius={5.5} />
						</svg>
						{MASTERY_NAMES[level]}
					</span>
				))}
				<span>Mastery can slip on a missed drill; it comes back with review.</span>
			</div>
		</div>
	);
}
