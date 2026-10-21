// Ranks glossary entries against a search string: exact term, then prefix, then alias, then words in the short definition.
import type { GlossaryEntry } from "@shared/types/content";

/** How well an entry matches; 0 means not at all. */
function scoreEntry(entry: GlossaryEntry, query: string): number
{
	const term = entry.term.toLowerCase();
	const aliases = entry.aliases.map((alias) => alias.toLowerCase());

	if (term === query || entry.id === query) return 100;
	if (term.startsWith(query)) return 80;
	if (aliases.some((alias) => alias.startsWith(query))) return 60;
	if (term.includes(query)) return 50;
	if (aliases.some((alias) => alias.includes(query))) return 40;
	if (entry.category.toLowerCase().includes(query)) return 20;
	if (entry.short.toLowerCase().includes(query)) return 10;

	return 0;
}

/** Entries matching the query, best first, ties by term. An empty query returns every entry by term. */
export function searchGlossary(entries: readonly GlossaryEntry[], rawQuery: string): GlossaryEntry[]
{
	const query = rawQuery.trim().toLowerCase();
	const byTerm = (first: GlossaryEntry, second: GlossaryEntry): number => first.term.localeCompare(second.term, "en", { sensitivity: "base" });

	if (!query) return [...entries].sort(byTerm);

	return entries
		.map((entry) => ({ entry, score: scoreEntry(entry, query) }))
		.filter((scored) => scored.score > 0)
		.sort((first, second) => second.score - first.score || byTerm(first.entry, second.entry))
		.map((scored) => scored.entry);
}
