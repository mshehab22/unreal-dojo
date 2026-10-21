// Every pattern card in one grid: earned ones in their tier frame, the rest as locked silhouettes.
import type { PatternCard as PatternCardContent } from "@shared/types/content";
import type { PlayerProgress, RulesSnapshot } from "@shared/types/progress";

import { Panel } from "@/components/Panel";
import { PatternCard } from "@/components/PatternCard";

/** Props for PatternCardGrid. */
interface PatternCardGridProps
{
	readonly cards: readonly PatternCardContent[];
	readonly progress: PlayerProgress;
	readonly rules: RulesSnapshot;
}

/** The collection, with the earned count in the title. */
export function PatternCardGrid({ cards, progress, rules }: PatternCardGridProps)
{
	const earned = cards.filter((card) => progress.patternCards[card.id]).length;

	return (
		<Panel title={`Pattern cards, ${earned} of ${cards.length}`} testId="character-cards" className="col-span-12">
			<div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2">
				{cards.map((card) =>
				{
					const owned = progress.patternCards[card.id];

					return <PatternCard key={card.id} card={card} tier={owned?.tier ?? null} useCasesPassed={owned?.useCasesPassed.length ?? 0} tierThresholds={rules.cardTierThresholds} />;
				})}
			</div>
		</Panel>
	);
}
