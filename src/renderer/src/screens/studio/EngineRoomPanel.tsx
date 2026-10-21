// The Studio's engine room and shipped-titles wall: a module per shipped mechanic, a line per passed boss.
import { BoxIcon } from "lucide-react";

import type { AttemptRecord, PlayerProgress } from "@shared/types/progress";

import { Panel } from "@/components/Panel";
import { formatShortDate, humanizeId } from "@/lib/formatting";
import type { QuestLocation } from "@/lib/questIndex";

/** Props for EngineRoomPanel. */
interface EngineRoomPanelProps
{
	readonly progress: PlayerProgress;
	readonly quests: ReadonlyMap<string, QuestLocation>;
}

/** How many module slots the room draws, earned or not. */
const ROOM_SLOTS = 6;

/** The first passing attempt of every boss, newest first: the shipped-titles wall. */
function shippedTitles(attempts: readonly AttemptRecord[], quests: ReadonlyMap<string, QuestLocation>): { title: string; client: string; at: string }[]
{
	const seen = new Set<string>();

	return attempts
		.filter((attempt) => attempt.passed && quests.get(attempt.questId)?.quest.kind === "boss")
		.filter((attempt) => !seen.has(attempt.questId) && seen.add(attempt.questId) !== undefined)
		.map((attempt) =>
		{
			const location = quests.get(attempt.questId);

			return { title: location?.quest.title.replace(/^Boss: /, "") ?? attempt.questId, client: location?.world.title ?? "", at: attempt.at };
		})
		.reverse();
}

/** Modules earned on the left, shipped titles on the right. */
export function EngineRoomPanel({ progress, quests }: EngineRoomPanelProps)
{
	const titles = shippedTitles(progress.attempts, quests);

	return (
		<Panel title="Engine room" testId="studio-engine-room" className="col-span-7">
			<div className="grid grid-cols-6 gap-2">
				{Array.from({ length: ROOM_SLOTS }, (_unused, index) =>
				{
					const module = progress.studio.modules[index];

					return module ? (
						<div key={module} title={humanizeId(module)} className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-md border border-pack/50 bg-pack-soft p-2 text-center">
							<BoxIcon className="size-5 text-pack" strokeWidth={1.75} />
							<span className="line-clamp-2 text-2xs leading-tight text-paper">{humanizeId(module)}</span>
						</div>
					) : (
						<div key={`empty-${index}`} className="aspect-square rounded-md border border-dashed border-line" />
					);
				})}
			</div>
			<div className="flex flex-col gap-2 border-t border-line pt-3">
				<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">Shipped titles</span>
				{titles.length === 0 ? (
					<p className="text-sm text-paper-faint">Beat a world's boss to ship your first title and earn a module.</p>
				) : (
					<ul data-testid="shipped-titles" className="flex flex-col gap-1">
						{titles.map((shipped) => (
							<li key={shipped.title} className="flex items-baseline justify-between gap-3 text-sm">
								<span className="truncate">
									<span className="text-paper">{shipped.title}</span>
									<span className="text-paper-faint"> for {shipped.client}</span>
								</span>
								<span className="shrink-0 font-mono text-2xs text-paper-faint">{formatShortDate(shipped.at)}</span>
							</li>
						))}
					</ul>
				)}
			</div>
		</Panel>
	);
}
