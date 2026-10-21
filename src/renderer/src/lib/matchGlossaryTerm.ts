// Finds the glossary identifier under the editor's cursor, using the flat alias table (prose links go through the TermLinker).
import type { GlossaryAlias } from "@shared/types/catalog";

/** The identifier alias (such as `UPROPERTY`) that exactly equals a word in the editor, or null. Feeds the editor hover. */
export function termAtWord(word: string, aliases: readonly GlossaryAlias[]): GlossaryAlias | null
{
	return aliases.find((alias) => alias.caseSensitive && alias.text === word) ?? null;
}
