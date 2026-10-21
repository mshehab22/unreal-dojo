// Renders quest Markdown with glossary terms as hover cards, linked by content-engine's TermLinker (the same rules as the verifier and the editor).
import { useMemo, type ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { PluggableList } from "unified";

import { termLinker } from "@shared/content/termLinker";

import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoQuery } from "@/data/useDojoQuery";
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

/** The props react-markdown hands the `glossary-term` element the TermLinker emits. */
interface GlossaryTermProps
{
	readonly entryId?: string;
	readonly children?: ReactNode;
}

/** Quest Markdown with headings, lists, code, and hoverable glossary terms. Works before the glossary loads; terms link once the alias table has. */
export function TermText({ markdown, className, inline = false }: TermTextProps)
{
	const aliases = useDojoQuery(QUERY_KEYS.glossaryAliases, (client) => client.getGlossaryAliases());
	const glossary = useDojoQuery(QUERY_KEYS.glossary, (client) => client.getGlossary());
	const aliasList = aliases.data;
	const entries = useMemo(() => new Map((glossary.data ?? []).map((entry) => [entry.id, entry])), [glossary.data]);
	const plugins = useMemo((): PluggableList => (aliasList ? [remarkGfm, [termLinker, { aliases: aliasList }]] : [remarkGfm]), [aliasList]);

	// Built once per glossary, so hover cards keep their state across renders.
	const components = useMemo(() =>
	{
		/** A linked term as its hover card, or plain text before the glossary loads. */
		const GlossaryTerm = ({ entryId, children }: GlossaryTermProps): ReactNode =>
		{
			const entry = entryId ? entries.get(entryId) : undefined;

			return entry ? <TermHoverCard entry={entry}>{children}</TermHoverCard> : <>{children}</>;
		};

		return {
			p: ({ children }) => (inline ? <span>{children}</span> : <p>{children}</p>),
			pre: ({ children }) => <>{children}</>,
			code: ({ className: languageClass, children }) =>
			{
				const text = textOf(children);

				if (languageClass?.startsWith("language-") || text.includes("\n")) return <CodeBlock code={text.replace(/\n$/, "")} />;

				return <code className="rounded-xs bg-raised px-1 py-0.5 font-mono text-[0.9em] text-paper">{children}</code>;
			},
			strong: ({ children }) => <strong className="font-semibold text-paper">{children}</strong>,
			a: ({ href, children }) => (
				<a href={href} target="_blank" rel="noreferrer" className="text-pack underline underline-offset-4">
					{children}
				</a>
			),
			"glossary-term": GlossaryTerm,
		} as Components;
	}, [entries, inline]);

	return (
		<div data-testid="term-text" className={cn(inline ? "inline" : PROSE_CLASS, "select-text", className)}>
			<Markdown remarkPlugins={plugins} components={components}>
				{markdown}
			</Markdown>
		</div>
	);
}
