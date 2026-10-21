// Holds the loaded glossary: entry lookup, the flat alias list for the TermLinker and Monaco, and one shared matcher.
import { GlossaryMatcher } from "@shared/content/GlossaryMatcher";
import type { GlossaryAlias } from "@shared/types/catalog";
import type { GlossaryEntry } from "@shared/types/content";

import { buildGlossaryAliases } from "../../content/buildGlossaryAliases";

/** The glossary for one content load. Build it from `LoadedContent.glossary`; rebuild it when content reloads. */
export class GlossaryService
{
	private readonly byId: Map<string, GlossaryEntry>;
	private readonly aliases: GlossaryAlias[];
	private matcherInstance: GlossaryMatcher | undefined;

	/** Indexes the entries by id and builds the alias list once, with app-shell's builder so the IPC table and this one are the same. */
	constructor(entries: readonly GlossaryEntry[])
	{
		this.byId = new Map(entries.map((entry) => [entry.id, entry]));
		this.aliases = buildGlossaryAliases(entries);
	}

	/** Every entry, in glossary order. */
	entries(): GlossaryEntry[]
	{
		return [...this.byId.values()];
	}

	/** One entry by id, or undefined. */
	entry(id: string): GlossaryEntry | undefined
	{
		return this.byId.get(id);
	}

	/** The flat alias list sent to the renderer for the TermLinker and Monaco's hover and completion providers. */
	aliasTable(): GlossaryAlias[]
	{
		return [...this.aliases];
	}

	/** A matcher over this glossary, compiled on first use. */
	matcher(): GlossaryMatcher
	{
		this.matcherInstance ??= new GlossaryMatcher(this.aliases);

		return this.matcherInstance;
	}
}
