// World Map: placeholder until the world map task, with the four pack regions drawn in their accents.
import { PlaceholderScreen } from "@/components/PlaceholderScreen";
import { PACK_ACCENTS, PACK_IDS } from "@/styles/tokenCatalog";

/** Packs as regions, worlds as contracts, quests as stages on a path. */
export function WorldMapScreen()
{
	return (
		<PlaceholderScreen
			testId="screen-worldMap"
			index={3}
			title="World Map"
			summary="Every pack is a region and every world a client contract. Quests are stages on the path."
			upcoming={[
				"Contract cards with the client's brief",
				"Quest stages: locked, available, passed",
				"Rematches glowing when due",
				"Boss nodes and test-out per world",
			]}
		>
			<div className="grid grid-cols-4 gap-3">
				{PACK_IDS.map((pack, position) => (
					<div key={pack} data-pack={pack} className="flex h-36 flex-col justify-between rounded-lg border border-pack/30 bg-pack-soft p-4">
						<div className="font-mono text-2xs tracking-widest text-pack uppercase">Region {position + 1}</div>
						<div>
							<div className="font-display text-xl font-semibold text-paper">{PACK_ACCENTS[pack].label}</div>
							<div className="min-h-9 text-xs text-paper-muted">{PACK_ACCENTS[pack].purpose}</div>
						</div>
					</div>
				))}
			</div>
		</PlaceholderScreen>
	);
}
