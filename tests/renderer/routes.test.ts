// Checks that location hashes map to the right screen and back.
import { describe, expect, it } from "vitest";

import { DEFAULT_ROUTE, ROUTES, hashForRoute, routeFromHash } from "../../src/renderer/src/app/router/routes";

describe("routeFromHash", () =>
{
	it("maps each route's own hash back to that route", () =>
	{
		for (const route of ROUTES)
		{
			expect(routeFromHash(hashForRoute(route.id)).id).toBe(route.id);
		}
	});

	it("falls back to the title screen for an empty or unknown hash", () =>
	{
		expect(routeFromHash("")).toBe(DEFAULT_ROUTE);
		expect(routeFromHash("#/nowhere")).toBe(DEFAULT_ROUTE);
		expect(DEFAULT_ROUTE.id).toBe("title");
	});

	it("ignores a trailing slash and a query", () =>
	{
		expect(routeFromHash("#/studio/").id).toBe("studio");
		expect(routeFromHash("#/codex?term=UObject").id).toBe("codex");
	});

	it("keeps every path unique", () =>
	{
		const paths = ROUTES.map((route) => route.path);

		expect(new Set(paths).size).toBe(paths.length);
	});
});
