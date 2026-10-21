// The learner's role as a small emblem: a hexagon with the level inside and the role name beside it.
import { cn } from "@/lib/utils";

/** Props for RoleBadge. */
interface RoleBadgeProps
{
	readonly role: string;
	readonly level: number;
	readonly nextRole?: { name: string; level: number } | null;
	readonly className?: string;
}

/** Role name with a level emblem, and the next role as a quiet hint. */
export function RoleBadge({ role, level, nextRole, className }: RoleBadgeProps)
{
	return (
		<div data-testid="role-badge" className={cn("flex items-center gap-3", className)}>
			<svg width="40" height="44" viewBox="0 0 40 44" aria-hidden="true" className="shrink-0">
				<path d="M20 2 L37 11.5 V32.5 L20 42 L3 32.5 V11.5 Z" className="fill-pack-soft stroke-pack" strokeWidth="1.5" />
				<text x="20" y="27" textAnchor="middle" className="fill-pack font-display text-[15px] font-bold">
					{level}
				</text>
			</svg>
			<div className="flex flex-col leading-tight">
				<span className="font-display text-lg font-semibold">{role}</span>
				{nextRole && (
					<span className="text-xs text-paper-faint">
						{nextRole.name} at level {nextRole.level}
					</span>
				)}
			</div>
		</div>
	);
}
