// Turns the glossary into the flat alias table that Monaco and the TermLinker match against.
import type { GlossaryAlias } from "@shared/types/catalog";
import type { GlossaryEntry } from "@shared/types/content";

/** An identifier has no spaces and has an underscore, `::`, a digit, or a capital after its first letter (`AActor`, `UPROPERTY`, `BeginPlay`). */
const IDENTIFIER_PATTERN = /^\S+$/;

/** The marks that make a single word an identifier rather than a plain word. */
const IDENTIFIER_MARK_PATTERN = /_|::|\d|^.+[A-Z]/;

/** Tells whether a term is a code identifier (matched exactly) rather than a plain word (matched in any case), per the content-engine spec. */
export function isIdentifierText(text: string): boolean
{
	return IDENTIFIER_PATTERN.test(text) && IDENTIFIER_MARK_PATTERN.test(text);
}

/** Returns one row per distinct term or alias of every entry, longest text first so the longest match wins. */
export function buildGlossaryAliases(glossary: readonly GlossaryEntry[]): GlossaryAlias[]
{
	const aliases: GlossaryAlias[] = [];

	for (const entry of glossary)
	{
		const texts = new Set([entry.term, ...entry.aliases].map((text) => text.trim()).filter((text) => text.length > 0));

		for (const text of texts)
		{
			aliases.push({ text, entryId: entry.id, caseSensitive: isIdentifierText(text), codeOnly: entry.linkMode === "code-only", short: entry.short });
		}
	}

	return aliases.sort((left, right) => right.text.length - left.text.length || left.text.localeCompare(right.text));
}
