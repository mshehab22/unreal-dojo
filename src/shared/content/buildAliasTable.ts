// Turns glossary entries into the flat alias list shared by the TermLinker and Monaco's hover and completion providers.
import type { GlossaryAlias, GlossaryEntry } from "../types/content";

/** Characters that only appear in code names, never in a plain English word. */
const IDENTIFIER_CHARACTERS = /[_:()<>#.0-9]/;

/**
 * Whether a spelling is a code identifier (matched case sensitively) rather than a plain word (matched case
 * insensitively). Identifiers contain an uppercase letter after the first character (`AActor`, `BeginPlay`,
 * `UPROPERTY`) or a character words never have (`TObjectPtr<>`, `UE_LOG`, `FMath::Lerp`). `Actor` and
 * `garbage collection` are plain words.
 */
export function isIdentifierSpelling(text: string): boolean
{
	return IDENTIFIER_CHARACTERS.test(text) || /[A-Z]/.test(text.slice(1));
}

/** One alias per spelling (the term first, then each alias), skipping blank and repeated spellings inside one entry. */
export function buildAliasTable(entries: readonly GlossaryEntry[]): GlossaryAlias[]
{
	const aliases: GlossaryAlias[] = [];

	for (const entry of entries)
	{
		const spellings = new Set([entry.term, ...entry.aliases].map((spelling) => spelling.trim()).filter((spelling) => spelling !== ""));

		for (const text of spellings)
		{
			aliases.push({
				text,
				entryId: entry.id,
				term: entry.term,
				short: entry.short,
				caseSensitive: isIdentifierSpelling(text),
				codeOnly: entry.linkMode === "code-only",
			});
		}
	}

	return aliases;
}
