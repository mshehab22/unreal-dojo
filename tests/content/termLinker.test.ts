// Checks term linking: identifier versus plain-word case rules, longest match, code blocks, headings, inline code, and code-only terms.
import type { Root } from "mdast";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { describe, expect, it } from "vitest";

import { termLinker } from "@shared/content/termLinker";
import type { GlossaryEntry } from "@shared/types/content";

import { buildGlossaryAliases } from "../../src/main/content/buildGlossaryAliases";
import { GlossaryService } from "../../src/main/services/content/GlossaryService";

/** A glossary entry with only the fields the linker reads filled in meaningfully. */
function entry(id: string, term: string, aliases: string[] = [], codeOnly: boolean = false): GlossaryEntry
{
	const made: GlossaryEntry = { id, term, aliases, category: "framework", short: `${term} short.`, long: "Long.", unrealDocsUrl: "https://dev.epicgames.com/x?application_version=5.8", related: [] };

	if (codeOnly) made.linkMode = "code-only";

	return made;
}

/** A small glossary covering each case. */
const GLOSSARY = [
	entry("actor", "Actor", ["AActor", "actors"]),
	entry("actor-component", "Actor Component", ["UActorComponent"]),
	entry("beginplay", "BeginPlay"),
	entry("check-macro", "check", [], true),
];

/** Parses Markdown, runs the linker, and returns every linked term as `entryId:text`, in order. */
function linkedTerms(markdown: string): string[]
{
	const processor = unified().use(remarkParse).use(termLinker, { aliases: buildGlossaryAliases(GLOSSARY) });
	const tree = processor.runSync(processor.parse(markdown)) as Root;
	const found: string[] = [];

	/** Collects glossaryTerm nodes depth first. */
	const walk = (node: { type: string; children?: unknown[]; entryId?: string; value?: string }): void =>
	{
		if (node.type === "glossaryTerm")
		{
			const child = node.children?.[0] as { value: string };
			found.push(`${node.entryId}:${child.value}`);
			return;
		}

		for (const child of node.children ?? []) walk(child as typeof node);
	};

	walk(tree);

	return found;
}

describe("termLinker", () =>
{
	it("matches plain words in any case and identifiers only in their exact case", () =>
	{
		expect(linkedTerms("An actor, an ACTOR, and AActor. Not aactor or beginplay.")).toEqual(["actor:actor", "actor:ACTOR", "actor:AActor"]);
	});

	it("prefers the longest match and never matches inside a longer word", () =>
	{
		expect(linkedTerms("Add an Actor Component to the reactor.")).toEqual(["actor-component:Actor Component"]);
	});

	it("skips fenced code blocks and headings but links the paragraph after them", () =>
	{
		expect(linkedTerms("# The Actor\n\n```cpp\nAActor* Actor;\n```\n\nCall BeginPlay.")).toEqual(["beginplay:BeginPlay"]);
	});

	it("links a whole inline code span, with or without trailing parentheses, and leaves partial spans alone", () =>
	{
		expect(linkedTerms("Use `AActor` and `BeginPlay()` but not `AActor* Owner`.")).toEqual(["actor:AActor", "beginplay:BeginPlay()"]);
	});

	it("links code-only terms only inside inline code", () =>
	{
		expect(linkedTerms("Check the flags, then call `check` on them.")).toEqual(["check-macro:check"]);
	});

	it("does not link inside links", () =>
	{
		expect(linkedTerms("See [the Actor docs](https://example.com).")).toEqual([]);
	});
});

describe("GlossaryService", () =>
{
	it("gives the flat alias list with case and code-only flags, and finds entries by id", () =>
	{
		const service = new GlossaryService(GLOSSARY);
		const table = service.aliasTable();

		expect(table.find((alias) => alias.text === "AActor")).toMatchObject({ entryId: "actor", caseSensitive: true, codeOnly: false, short: "Actor short." });
		expect(table.find((alias) => alias.text === "actors")).toMatchObject({ caseSensitive: false });
		expect(table.find((alias) => alias.text === "check")).toMatchObject({ codeOnly: true });
		expect(service.entry("beginplay")?.term).toBe("BeginPlay");
		expect(service.matcher().findInProse("one actor").map((match) => match.entryId)).toEqual(["actor"]);
	});
});
