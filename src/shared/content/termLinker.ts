// The TermLinker remark plugin: wraps glossary terms in prose and inline code in `glossaryTerm` nodes for hover cards.
import type { InlineCode, Parent, PhrasingContent, Root, RootContent, Text } from "mdast";

import type { GlossaryAlias } from "../types/catalog";

import { GlossaryMatcher } from "./GlossaryMatcher";

/** A linked glossary term. react-markdown renders it as a `<glossary-term entry-id="...">` element the renderer maps to a HoverCard. */
export interface GlossaryTermNode extends Parent
{
	type: "glossaryTerm";
	entryId: string;
	children: (Text | InlineCode)[];
	data: { hName: "glossary-term"; hProperties: { entryId: string } };
}

declare module "mdast"
{
	/** Lets `glossaryTerm` sit wherever phrasing content can. */
	interface PhrasingContentMap
	{
		glossaryTerm: GlossaryTermNode;
	}

	/** Lets `glossaryTerm` appear in a parent's children list. */
	interface RootContentMap
	{
		glossaryTerm: GlossaryTermNode;
	}
}

/** Options for the plugin: the flat alias list (from GlossaryService through IPC). */
export interface TermLinkerOptions
{
	aliases: readonly GlossaryAlias[];
}

/** Node types whose text is never linked: headings, code blocks, links, raw HTML, and terms already linked. */
const SKIPPED_TYPES = new Set(["heading", "code", "link", "linkReference", "html", "definition", "glossaryTerm"]);

/** Wraps one or more phrasing nodes in a glossaryTerm node. */
function termNode(entryId: string, child: Text | InlineCode): GlossaryTermNode
{
	return { type: "glossaryTerm", entryId, children: [child], data: { hName: "glossary-term", hProperties: { entryId } } };
}

/** Splits a text node into plain text and linked terms. Returns the node unchanged in a list when nothing matches. */
function linkText(node: Text, matcher: GlossaryMatcher): PhrasingContent[]
{
	const matches = matcher.findInProse(node.value);

	if (matches.length === 0) return [node];

	const pieces: PhrasingContent[] = [];
	let position = 0;

	for (const match of matches)
	{
		if (match.start > position) pieces.push({ type: "text", value: node.value.slice(position, match.start) });

		pieces.push(termNode(match.entryId, { type: "text", value: node.value.slice(match.start, match.end) }));
		position = match.end;
	}

	if (position < node.value.length) pieces.push({ type: "text", value: node.value.slice(position) });

	return pieces;
}

/** Walks the tree, replacing linkable text and inline code in every parent that is not skipped. */
function linkChildren(parent: Parent, matcher: GlossaryMatcher): void
{
	const linked: RootContent[] = [];

	for (const child of parent.children)
	{
		if (child.type === "text")
		{
			linked.push(...linkText(child, matcher));
			continue;
		}

		if (child.type === "inlineCode")
		{
			const entryId = matcher.matchInlineCode(child.value);
			linked.push(entryId === undefined ? child : termNode(entryId, child));
			continue;
		}

		if ("children" in child && !SKIPPED_TYPES.has(child.type)) linkChildren(child, matcher);

		linked.push(child);
	}

	parent.children = linked;
}

/**
 * The remark plugin. Prose links every term except code-only ones, longest match first, identifiers case sensitive
 * and plain words case insensitive. An inline code span links when the whole span is one spelling, for every entry
 * including code-only ones (A200). Headings, code blocks, and links are never touched.
 */
export function termLinker(options: TermLinkerOptions): (tree: Root) => void
{
	const matcher = new GlossaryMatcher(options.aliases);

	return (tree) => linkChildren(tree, matcher);
}
