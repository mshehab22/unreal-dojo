// Codex: the searchable glossary, with category filters, each entry in full, and "drill me".
import { useMemo, useState } from "react";

import { useCodexStore } from "@/app/useCodexStore";
import { AppErrorView } from "@/components/AppErrorView";
import { KeyboardHints } from "@/components/KeyboardHints";
import { LoadingBlock } from "@/components/LoadingBlock";
import { ScreenHeader } from "@/components/ScreenHeader";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoQuery } from "@/data/useDojoQuery";
import { modifierKeyLabel } from "@/lib/platform";
import { indexQuests } from "@/lib/questIndex";
import { searchGlossary } from "@/lib/searchGlossary";

import { CodexEntryDetail } from "./codex/CodexEntryDetail";
import { CodexEntryList } from "./codex/CodexEntryList";

/** Every Unreal term the learner meets, in a sentence and in depth. */
export function CodexScreen()
{
	const glossary = useDojoQuery(QUERY_KEYS.glossary, (client) => client.getGlossary());
	const progress = useDojoQuery(QUERY_KEYS.progress, (client) => client.getProgress());
	const availability = useDojoQuery(QUERY_KEYS.availability, (client) => client.getQuestAvailability());
	const packs = useDojoQuery(QUERY_KEYS.packs, (client) => client.listPacks());
	const { selectedTermId, category, selectTerm, setCategory } = useCodexStore();
	const [query, setQuery] = useState("");

	const entries = glossary.data ?? [];
	const entriesById = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries]);
	const categories = useMemo(() => [...new Set(entries.map((entry) => entry.category))].sort(), [entries]);
	const matching = useMemo(() => searchGlossary(entries, query).filter((entry) => !category || entry.category === category), [entries, query, category]);
	const quests = useMemo(() => indexQuests(packs.data ?? []), [packs.data]);
	const selected = (selectedTermId ? entriesById.get(selectedTermId) : undefined) ?? matching[0];

	return (
		<section data-testid="screen-codex" className="mx-auto flex w-full max-w-6xl flex-col gap-6">
			<ScreenHeader eyebrow="Codex" title="Codex" summary="Every Unreal term you meet, in a sentence and in depth, with Epic's docs one click away." />
			{glossary.error && !glossary.data && <AppErrorView error={glossary.error} onRetry={glossary.reload} />}
			{!glossary.data && !glossary.error && <LoadingBlock height="h-96" />}
			{glossary.data && (
				<div className="grid grid-cols-[16rem_minmax(0,1fr)] items-start gap-6">
					<CodexEntryList
						entries={matching}
						categories={categories}
						query={query}
						category={category}
						selectedId={selected?.id ?? null}
						onQueryChange={setQuery}
						onCategoryChange={setCategory}
						onSelect={selectTerm}
					/>
					{selected ? (
						<CodexEntryDetail entry={selected} entriesById={entriesById} progress={progress.data} availability={availability.data} quests={quests} onSelect={selectTerm} />
					) : (
						<p className="text-sm text-paper-faint">No term matches that filter.</p>
					)}
				</div>
			)}
			<KeyboardHints hints={[{ keys: [modifierKeyLabel(), "K"], label: "Search from anywhere" }, { keys: ["Esc"], label: "Close search" }]} />
		</section>
	);
}
