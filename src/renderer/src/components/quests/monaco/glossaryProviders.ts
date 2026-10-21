// Monaco hover and completion for glossary terms: hover any identifier the glossary knows; complete the quest's own terms. Registered once for C++.
import type { GlossaryAlias } from "@shared/types/catalog";

import { termAtWord } from "@/lib/matchGlossaryTerm";

import { monaco } from "./monacoSetup";

/** What the providers read; the editor component replaces it when its quest or the glossary changes. */
interface GlossaryData
{
	aliases: readonly GlossaryAlias[];

	/** Entry ids of the quest's terms, offered first by completion. */
	questTermIds: ReadonlySet<string>;
}

let current: GlossaryData = { aliases: [], questTermIds: new Set() };
let registered = false;

/** Points the providers at new data. */
export function setGlossaryData(aliases: readonly GlossaryAlias[], questTermIds: readonly string[]): void
{
	current = { aliases, questTermIds: new Set(questTermIds) };
}

/** Registers the hover and completion providers for C++ the first time it is called. */
export function registerGlossaryProviders(): void
{
	if (registered) return;

	registered = true;

	monaco.languages.registerHoverProvider("cpp", {
		provideHover: (model, position) =>
		{
			const word = model.getWordAtPosition(position);
			const alias = word ? termAtWord(word.word, current.aliases) : null;

			if (!word || !alias) return null;

			return {
				range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
				contents: [{ value: `**${alias.text}**` }, { value: alias.short }],
			};
		},
	});

	monaco.languages.registerCompletionItemProvider("cpp", {
		provideCompletionItems: (model, position) =>
		{
			const word = model.getWordUntilPosition(position);
			const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
			const seen = new Set<string>();
			const suggestions = current.aliases
				.filter((alias) => alias.caseSensitive && current.questTermIds.has(alias.entryId) && /^[A-Za-z_][A-Za-z0-9_]*$/.test(alias.text))
				.filter((alias) => !seen.has(alias.text) && seen.add(alias.text))
				.map((alias) => ({ label: alias.text, kind: monaco.languages.CompletionItemKind.Keyword, insertText: alias.text, detail: "Quest term", documentation: alias.short, range }));

			return { suggestions };
		},
	});
}
