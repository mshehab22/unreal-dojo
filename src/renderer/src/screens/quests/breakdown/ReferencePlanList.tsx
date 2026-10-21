// The reference plan as text: every piece with its kind and what it is, and every arrow in words. Readable at any size, and the screen reader's path to the plan.
import type { ReferencePlan } from "@shared/types/content";

/** Props for ReferencePlanList. */
interface ReferencePlanListProps
{
	readonly reference: ReferencePlan;
}

/** Two lists: pieces, then how they connect. */
export function ReferencePlanList({ reference }: ReferencePlanListProps)
{
	const names = new Map(reference.pieces.map((piece) => [piece.id, piece.label]));

	return (
		<div data-testid="reference-plan-list" className="flex flex-col gap-3">
			<ul aria-label="Reference pieces" className="flex flex-col gap-2">
				{reference.pieces.map((piece) => (
					<li key={piece.id} data-testid="reference-piece" className="flex flex-col gap-0.5 text-sm">
						<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">{piece.kind}</span>
						<span className="text-paper">{piece.label}</span>
					</li>
				))}
			</ul>
			{reference.edges.length > 0 && (
				<div className="flex flex-col gap-1.5">
					<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">How they connect</span>
					<ul aria-label="Reference arrows" className="flex list-disc flex-col gap-1 pl-4 text-xs text-paper-muted">
						{reference.edges.map((edge) => (
							<li key={`${edge.from}->${edge.to}:${edge.label}`} data-testid="reference-edge">
								{names.get(edge.from) ?? edge.from}: <span className="text-pack">{edge.label}</span> ({names.get(edge.to) ?? edge.to})
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
