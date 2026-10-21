// A world's quests as a path of stages that wraps into balanced rows to fit the card, each row on its own line (A390).
import type { QuestOutline } from "@shared/types/catalog";
import type { QuestAvailability } from "@shared/types/progress";

import { useElementWidth } from "@/hooks/useElementWidth";
import { balancedRows, stagesPerRow } from "@/lib/pathRows";

import { StageNode } from "./StageNode";

/** Props for StagePath. */
interface StagePathProps
{
	readonly quests: readonly QuestOutline[];
	readonly availability: Readonly<Record<string, QuestAvailability>>;
	readonly rematchShare: number;
}

/** Rows of stages in equal columns; the line in each row runs from its first stage's center to its last. */
export function StagePath({ quests, availability, rematchShare }: StagePathProps)
{
	const [reference, width] = useElementWidth<HTMLDivElement>();
	const rows = balancedRows(quests, stagesPerRow(width));
	const columns = rows[0]?.length ?? 1;

	return (
		<div ref={reference} data-testid="stage-path" data-rows={rows.length} className="flex min-w-0 flex-col gap-5">
			{rows.map((row) =>
			{
				const columnShare = 100 / columns;

				return (
					<div key={row[0]?.id} className="relative grid justify-items-center" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
						{row.length > 1 && (
							<span
								aria-hidden="true"
								className="absolute top-5 h-px bg-line-strong"
								style={{ left: `${columnShare / 2}%`, right: `${100 - columnShare * (row.length - 0.5)}%` }}
							/>
						)}
						{row.map((quest) => (
							<StageNode key={quest.id} quest={quest} availability={availability[quest.id]} rematchShare={rematchShare} />
						))}
					</div>
				);
			})}
		</div>
	);
}
