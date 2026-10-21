// Finds the glossary entry a piece of text names exactly, using the flat alias table. The temporary TermText linker uses it until M1.8's TermLinker merges.
import type { GlossaryAlias } from "@shared/types/catalog";

/** The entry id whose term or alias equals `text`: identifiers match exactly, plain words in any case. Null when none does. */
export function matchGlossaryTerm(text: string, aliases: readonly GlossaryAlias[]): string | null
{
	const trimmed = text.trim();

	if (trimmed.length === 0) return null;

	const lower = trimmed.toLowerCase();
	const found = aliases.find((alias) => (alias.caseSensitive ? alias.text === trimmed : alias.text.toLowerCase() === lower));

	return found?.entryId ?? null;
}

/** The identifier alias (such as `UPROPERTY`) that exactly equals a word in the editor, or null. Feeds the editor hover. */
export function termAtWord(word: string, aliases: readonly GlossaryAlias[]): GlossaryAlias | null
{
	return aliases.find((alias) => alias.caseSensitive && alias.text === word) ?? null;
}
