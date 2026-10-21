// Finds glossary terms in prose and in inline code, longest match first, with identifier and plain-word case rules.
import type { GlossaryAlias } from "../types/content";

/** One glossary term found in a piece of text. */
export interface TermMatch
{
	/** Index of the first character of the match. */
	start: number;

	/** Index just past the last character. */
	end: number;

	entryId: string;
}

/** A compiled search over a group of spellings that share one case rule. */
interface SpellingSearch
{
	pattern: RegExp;

	/** Spelling (lowercased when the search ignores case) to entry id. */
	entryIds: Map<string, string>;
	ignoreCase: boolean;
}

/** Characters that count as part of a word, so a term never matches inside a longer word. */
const WORD_CHARACTER = "A-Za-z0-9_";

/** Escapes a spelling for use inside a regular expression. */
function escapeForPattern(text: string): string
{
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds one search for a group of spellings. Longer spellings come first in the alternation, so at any position the
 * longest spelling wins ("Actor Component" before "Actor"). The first entry to claim a spelling keeps it.
 */
function createSearch(aliases: readonly GlossaryAlias[], ignoreCase: boolean): SpellingSearch | undefined
{
	const entryIds = new Map<string, string>();

	for (const alias of aliases)
	{
		const key = ignoreCase ? alias.text.toLowerCase() : alias.text;

		if (!entryIds.has(key)) entryIds.set(key, alias.entryId);
	}

	if (entryIds.size === 0) return undefined;

	const alternatives = [...entryIds.keys()].sort((first, second) => second.length - first.length).map(escapeForPattern);
	const pattern = new RegExp(`(?<![${WORD_CHARACTER}])(?:${alternatives.join("|")})(?![${WORD_CHARACTER}])`, ignoreCase ? "gi" : "g");

	return { pattern, entryIds, ignoreCase };
}

/** Matches glossary spellings in text. Build one per glossary and reuse it; it holds no per-call state between calls. */
export class GlossaryMatcher
{
	private readonly proseSearches: SpellingSearch[];
	private readonly codeSpellings = new Map<string, string>();
	private readonly codeWordSpellings = new Map<string, string>();

	/** Compiles the searches for prose (code-only entries left out) and the exact-span lookups for inline code. */
	constructor(aliases: readonly GlossaryAlias[])
	{
		const prose = aliases.filter((alias) => !alias.codeOnly);

		this.proseSearches = [createSearch(prose.filter((alias) => alias.caseSensitive), false), createSearch(prose.filter((alias) => !alias.caseSensitive), true)]
			.filter((search): search is SpellingSearch => search !== undefined);

		for (const alias of aliases)
		{
			if (alias.caseSensitive && !this.codeSpellings.has(alias.text)) this.codeSpellings.set(alias.text, alias.entryId);
			if (!alias.caseSensitive && !this.codeWordSpellings.has(alias.text.toLowerCase())) this.codeWordSpellings.set(alias.text.toLowerCase(), alias.entryId);
		}
	}

	/**
	 * Every non-overlapping term in a piece of prose, left to right. Where matches overlap, the one that starts first
	 * wins, then the longer one, then the case-sensitive one. Code-only entries never match prose.
	 */
	findInProse(text: string): TermMatch[]
	{
		const candidates: (TermMatch & { caseSensitive: boolean })[] = [];

		for (const search of this.proseSearches)
		{
			search.pattern.lastIndex = 0;

			for (const found of text.matchAll(search.pattern))
			{
				const key = search.ignoreCase ? found[0].toLowerCase() : found[0];
				const entryId = search.entryIds.get(key);

				if (entryId !== undefined) candidates.push({ start: found.index, end: found.index + found[0].length, entryId, caseSensitive: !search.ignoreCase });
			}
		}

		candidates.sort((first, second) => first.start - second.start || second.end - first.end || Number(second.caseSensitive) - Number(first.caseSensitive));

		const chosen: TermMatch[] = [];
		let coveredUntil = 0;

		for (const candidate of candidates)
		{
			if (candidate.start < coveredUntil) continue;

			chosen.push({ start: candidate.start, end: candidate.end, entryId: candidate.entryId });
			coveredUntil = candidate.end;
		}

		return chosen;
	}

	/**
	 * The entry an inline code span names, when the whole span (trimmed, a trailing `()` ignored) is one spelling.
	 * Code-only entries match here. Identifiers must match exactly; plain words ignore case.
	 */
	matchInlineCode(code: string): string | undefined
	{
		const trimmed = code.trim();
		const candidates = trimmed.endsWith("()") ? [trimmed, trimmed.slice(0, -2)] : [trimmed];

		for (const candidate of candidates)
		{
			const entryId = this.codeSpellings.get(candidate) ?? this.codeWordSpellings.get(candidate.toLowerCase());

			if (entryId !== undefined) return entryId;
		}

		return undefined;
	}
}
