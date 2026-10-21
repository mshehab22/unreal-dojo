// Keeps the /dev/tokens gallery's catalog and tokens.css in step: every listed token exists, and every color token is listed.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { allCatalogTokenNames } from "../../src/renderer/src/styles/tokenCatalog";

const TOKENS_CSS = readFileSync(resolve("src/renderer/src/styles/tokens.css"), "utf8");

/** Every custom property declared in tokens.css with a concrete value (not the `*: initial` resets). */
function declaredTokenNames(): Set<string>
{
	const names = [...TOKENS_CSS.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((match) => match[1] ?? "");

	return new Set(names);
}

describe("token catalog", () =>
{
	it("lists only tokens that tokens.css declares", () =>
	{
		const declared = declaredTokenNames();
		const missing = allCatalogTokenNames().filter((name) => !declared.has(name));

		expect(missing).toEqual([]);
	});

	it("lists every color token except the shadcn aliases and the pack variables", () =>
	{
		const listed = new Set(allCatalogTokenNames());
		const shadcnAliases = /^--color-(background|foreground|card|popover|primary|secondary|muted|accent|destructive|border|input|ring|pack)/;
		const colors = [...declaredTokenNames()].filter((name) => name.startsWith("--color-") && !shadcnAliases.test(name));
		const unlisted = colors.filter((name) => !listed.has(name));

		expect(unlisted).toEqual([]);
	});

	it("has no em dashes", () =>
	{
		expect(TOKENS_CSS.includes("\u2014")).toBe(false);
	});
});
