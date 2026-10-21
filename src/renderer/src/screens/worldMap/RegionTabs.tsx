// The packs as regions along the top of the World Map, each in its accent with how many quests are passed.
import type { PackOutline } from "@shared/types/catalog";
import type { QuestAvailability } from "@shared/types/progress";

import { cn } from "@/lib/utils";

/** Props for RegionTabs. */
interface RegionTabsProps
{
	readonly packs: readonly PackOutline[];
	readonly availability: Readonly<Record<string, QuestAvailability>>;
	readonly selectedId: string;
	readonly onSelect: (packId: string) => void;
}

/** One tab per pack. */
export function RegionTabs({ packs, availability, selectedId, onSelect }: RegionTabsProps)
{
	return (
		<div role="tablist" aria-label="Regions" className="grid grid-cols-4 gap-2">
			{packs.map((pack) =>
			{
				const quests = pack.worlds.flatMap((world) => world.quests);
				const passed = quests.filter((quest) => availability[quest.id]?.status === "passed").length;
				const isLocked = quests.every((quest) => availability[quest.id]?.status === "locked");
				const isSelected = pack.id === selectedId;

				return (
					<button
						key={pack.id}
						type="button"
						role="tab"
						aria-selected={isSelected}
						data-pack={pack.id}
						data-testid="region-tab"
						onClick={() => onSelect(pack.id)}
						className={cn(
							"flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors duration-(--duration-fast)",
							isSelected ? "border-pack bg-pack-soft" : "border-line bg-surface hover:border-line-strong",
						)}
					>
						<span className="flex items-center justify-between gap-2">
							<span className="font-mono text-2xs tracking-widest text-pack uppercase">Region {pack.order}</span>
							<span className="font-mono text-2xs text-paper-faint tabular-nums">{isLocked ? "Locked" : `${passed}/${quests.length}`}</span>
						</span>
						<span className="min-h-10 font-display text-base leading-tight font-semibold">{pack.title}</span>
						<span className="h-1 overflow-hidden rounded-pill bg-raised">
							<span className="block h-full rounded-pill bg-pack" style={{ width: `${quests.length ? Math.round((passed / quests.length) * 100) : 0}%` }} />
						</span>
					</button>
				);
			})}
		</div>
	);
}
