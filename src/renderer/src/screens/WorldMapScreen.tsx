// World Map: packs as regions, worlds as client contracts, quests as stages on a path with the boss at the end.
import { useState } from "react";

import { worldKeyOf } from "@shared/types/progress";

import { AppErrorView } from "@/components/AppErrorView";
import { LoadingBlock } from "@/components/LoadingBlock";
import { ScreenHeader } from "@/components/ScreenHeader";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoQuery } from "@/data/useDojoQuery";

import { ContractCard } from "./worldMap/ContractCard";
import { MapLegend } from "./worldMap/MapLegend";
import { RegionTabs } from "./worldMap/RegionTabs";

/** The map of every pack, world, and quest, with each quest's state from the progress service. */
export function WorldMapScreen()
{
	const packs = useDojoQuery(QUERY_KEYS.packs, (client) => client.listPacks());
	const availability = useDojoQuery(QUERY_KEYS.availability, (client) => client.getQuestAvailability());
	const testOut = useDojoQuery(QUERY_KEYS.testOut, (client) => client.getTestOutStatus());
	const rules = useDojoQuery(QUERY_KEYS.rules, (client) => client.getRules());
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const firstError = [packs, availability, testOut, rules].find((query) => query.error && query.data === undefined);
	const rematchShare = rules.data?.rematchShare;
	const selected = packs.data?.find((pack) => pack.id === selectedId) ?? packs.data?.[0];

	return (
		<section data-testid="screen-worldMap" className="mx-auto flex w-full max-w-6xl flex-col gap-6">
			<ScreenHeader eyebrow="World Map" title="World Map" summary="Every pack is a region and every world a client's contract. Hover a stage to see what it is, or why it is still locked." />
			{firstError?.error && <AppErrorView error={firstError.error} onRetry={firstError.reload} />}
			{!firstError && !(packs.data && availability.data && rules.data) && <LoadingBlock height="h-96" />}
			{packs.data && availability.data && rematchShare !== undefined && selected && (
				<>
					<RegionTabs packs={packs.data} availability={availability.data} selectedId={selected.id} onSelect={setSelectedId} />
					<div data-pack={selected.id} role="tabpanel" aria-label={selected.title} className="flex flex-col gap-4">
						<p className="text-sm text-paper-muted">{selected.summary}</p>
						{selected.worlds.map((world) => (
							<ContractCard key={world.id} packId={selected.id} world={world} availability={availability.data ?? {}} testOut={testOut.data?.[worldKeyOf(selected.id, world.id)]} rematchShare={rematchShare} />
						))}
					</div>
					<MapLegend />
				</>
			)}
		</section>
	);
}
