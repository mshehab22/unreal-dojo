// The patterns a quest uses, as chips. Callers show them only after the pass or the reference reveal, so a pattern is never named before it is built (A64).
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoQuery } from "@/data/useDojoQuery";

/** Props for PatternChips. */
interface PatternChipsProps
{
	readonly patternIds: readonly string[];
}

/** One chip per pattern, by its card title. Nothing when the quest uses none. */
export function PatternChips({ patternIds }: PatternChipsProps)
{
	const cards = useDojoQuery(QUERY_KEYS.patternCards, (client) => client.getPatternCards());
	const titles = new Map((cards.data ?? []).map((card) => [card.id, card.title]));

	if (patternIds.length === 0) return null;

	return (
		<ul data-testid="pattern-chips" aria-label="Patterns used" className="flex flex-wrap gap-1.5">
			{patternIds.map((patternId) => (
				<li key={patternId} className="rounded-pill border border-patterns/60 bg-patterns-soft px-2.5 py-0.5 text-xs text-patterns">
					{titles.get(patternId) ?? patternId}
				</li>
			))}
		</ul>
	);
}
