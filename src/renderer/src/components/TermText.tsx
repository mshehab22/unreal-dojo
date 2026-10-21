// Renders quest Markdown with glossary terms as hover cards. The seam for M1.8's TermLinker: today a temporary linker links inline code and bold text that name a term exactly.
import type { ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import type { GlossaryAlias } from "@shared/types/catalog";
import type { GlossaryEntry } from "@shared/types/content";

import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoQuery } from "@/data/useDojoQuery";
import { matchGlossaryTerm } from "@/lib/matchGlossaryTerm";
import { cn } from "@/lib/utils";

import { CodeBlock } from "./quests/CodeBlock";
import { TermHoverCard } from "./TermHoverCard";

/** Block layout for headings, lists, and paragraphs inside quest Markdown. */
const PROSE_CLASS = "flex flex-col gap-3 text-sm leading-relaxed text-paper-muted [&_h1]:font-display [&_h1]:text-xl [&_h1]:text-paper [&_h2]:pt-1 [&_h2]:font-mono [&_h2]:text-2xs [&_h2]:tracking-widest [&_h2]:text-paper-faint [&_h2]:uppercase [&_h3]:font-semibold [&_h3]:text-paper [&_li]:pl-1 [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-1.5 [&_ol]:pl-5 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5";

/** Props for TermText. */
interface TermTextProps
{
	readonly markdown: string;
	readonly className?: string;

	/** Inline renders one paragraph without its block margin, for prompts and labels. */
	readonly inline?: boolean;
}

/** The plain text of a rendered child, for matching it against the glossary. */
function textOf(children: ReactNode): string
{
	if (typeof children === "string" || typeof children === "number") return String(children);
	if (Array.isArray(children)) return children.map(textOf).join("");

	return "";
}

/** Wraps `content` in a hover card when `text` names a glossary term. */
function linked(text: string, content: ReactNode, aliases: readonly GlossaryAlias[], entries: ReadonlyMap<string, GlossaryEntry>): ReactNode
{
	const entryId = matchGlossaryTerm(text, aliases);
	const entry = entryId ? entries.get(entryId) : undefined;

	return entry ? <TermHoverCard entry={entry}>{content}</TermHoverCard> : content;
}

/** Quest Markdown with headings, lists, code, and hoverable glossary terms. Works before the glossary loads; terms link once it has. */
export function TermText({ markdown, className, inline = false }: TermTextProps)
{
	const aliases = useDojoQuery(QUERY_KEYS.glossaryAliases, (client) => client.getGlossaryAliases());
	const glossary = useDojoQuery(QUERY_KEYS.glossary, (client) => client.getGlossary());
	const aliasList = aliases.data ?? [];
	const entries = new Map((glossary.data ?? []).map((entry) => [entry.id, entry]));

	const components: Components = {
		p: ({ children }) => (inline ? <span>{children}</span> : <p>{children}</p>),
		pre: ({ children }) => <>{children}</>,
		code: ({ className: languageClass, children }) =>
		{
			const text = textOf(children);

			if (languageClass?.startsWith("language-") || text.includes("\n")) return <CodeBlock code={text.replace(/\n$/, "")} />;

			return linked(text, <code className="rounded-xs bg-raised px-1 py-0.5 font-mono text-[0.9em] text-paper">{children}</code>, aliasList, entries);
		},
		strong: ({ children }) => linked(textOf(children), <strong className="font-semibold text-paper">{children}</strong>, aliasList, entries),
		a: ({ href, children }) => (
			<a href={href} target="_blank" rel="noreferrer" className="text-pack underline underline-offset-4">
				{children}
			</a>
		),
	};

	return (
		<div data-testid="term-text" className={cn(inline ? "inline" : PROSE_CLASS, "select-text", className)}>
			<Markdown remarkPlugins={[remarkGfm]} components={components}>
				{markdown}
			</Markdown>
		</div>
	);
}
