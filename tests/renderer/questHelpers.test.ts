// Pure helpers behind the quest screens: choice shuffling (A61), the breakdown board model, brief splitting, marked lines, drill routes, and term matching.
import { describe, expect, it } from "vitest";

import type { GlossaryAlias } from "@shared/types/catalog";
import type { ReferencePlan } from "@shared/types/content";

import { hashForRoute, routeFromHash, routeParametersFromHash } from "../../src/renderer/src/app/router/routes";
import { misplacedLineIds } from "../../src/renderer/src/components/quests/parsonsPlacement";
import { termAtWord } from "../../src/renderer/src/lib/matchGlossaryTerm";
import { shuffledOrder } from "../../src/renderer/src/lib/presentationOrder";
import { columnsForBox, edgeKindFromLabel, layoutPositions, newPiece, planProblems, referenceAsPlan, withEdge, withoutPiece } from "../../src/renderer/src/screens/quests/breakdown/boardModel";
import { markedLineKey, markedLinesOf } from "../../src/renderer/src/screens/quests/build/markedLines";
import { splitBrief } from "../../src/renderer/src/screens/quests/build/splitBrief";
import { drillRequestFromRoute, routeForDrillRequest } from "../../src/renderer/src/screens/quests/drill/drillRequestFromRoute";

/** A random source that answers a fixed sequence, then repeats it. */
function sequence(values: number[]): () => number
{
	let index = 0;

	return () => values[index++ % values.length] ?? 0;
}

describe("shuffledOrder (A61)", () =>
{
	it("returns a permutation of every index", () =>
	{
		const order = shuffledOrder(6, sequence([0.9, 0.1, 0.5, 0.3, 0.7]));

		expect([...order].sort()).toEqual([0, 1, 2, 3, 4, 5]);
	});

	it("never shows two or more choices in the authored order, even when the random source keeps saying so", () =>
	{
		// Math.floor(0.999 * (index + 1)) === index, so every swap is a no-op.
		const order = shuffledOrder(4, () => 0.999);

		expect(order).not.toEqual([0, 1, 2, 3]);
		expect([...order].sort()).toEqual([0, 1, 2, 3]);
	});

	it("handles zero and one item", () =>
	{
		expect(shuffledOrder(0)).toEqual([]);
		expect(shuffledOrder(1)).toEqual([0]);
	});
});

describe("breakdown board model", () =>
{
	it("gives new pieces unused ids and blank text", () =>
	{
		const first = newPiece("class", { pieces: [], edges: [] });
		const second = newPiece("event", { pieces: [first], edges: [] });

		expect(first).toEqual({ id: "piece-1", kind: "class", label: "", purpose: "" });
		expect(second.id).toBe("piece-2");
	});

	it("blocks a submit until every piece has a name and a purpose label", () =>
	{
		expect(planProblems({ pieces: [], edges: [] })).toEqual(["Add at least one piece."]);
		expect(planProblems({ pieces: [{ id: "a", kind: "class", label: "Dash", purpose: "" }], edges: [] })).toEqual(["One piece has no purpose label."]);
		expect(planProblems({ pieces: [{ id: "a", kind: "class", label: "Dash", purpose: "Launches the character" }], edges: [] })).toEqual([]);
	});

	it("removes a piece with its arrows and refuses duplicate or self arrows", () =>
	{
		const plan = { pieces: [newPiece("class", { pieces: [], edges: [] }), { id: "piece-2", kind: "component" as const, label: "", purpose: "" }], edges: [] };
		const linked = withEdge(plan, "piece-1", "piece-2", "owns");

		expect(withEdge(linked, "piece-1", "piece-2", "owns").edges).toHaveLength(1);
		expect(withEdge(linked, "piece-1", "piece-1", "then").edges).toHaveLength(1);
		expect(withoutPiece(linked, "piece-2")).toEqual({ pieces: [plan.pieces[0]], edges: [] });
	});

	it("lays pieces out on a grid and keeps positions the learner dragged", () =>
	{
		const pieces = Array.from({ length: 8 }, (_value, index) => ({ id: `p${index}`, kind: "class" as const, label: "", purpose: "" }));
		const positions = layoutPositions({ pieces, edges: [] }, { p3: { x: 999, y: 999 } });

		expect(new Set(Object.values(positions).map((position) => position.x)).size).toBeLessThanOrEqual(3);
		expect(positions["p3"]).toEqual({ x: 999, y: 999 });
	});

	it("reads a reference plan in the board's shape, with edge kinds by word (A316)", () =>
	{
		const reference: ReferencePlan = {
			id: "r",
			title: "R",
			pieces: [{ id: "a", kind: "component", label: "Dash", covers: [] }, { id: "b", kind: "event", label: "Ready", covers: [] }],
			edges: [{ from: "a", to: "b", label: "broadcasts the dash start" }],
		};

		expect(referenceAsPlan(reference)).toEqual({ pieces: [{ id: "a", kind: "component", label: "Dash", purpose: "Dash" }, { id: "b", kind: "event", label: "Ready", purpose: "Ready" }], edges: [{ from: "a", to: "b", kind: "then" }] });
		expect(edgeKindFromLabel("owns the timer")).toBe("owns");
		expect(edgeKindFromLabel("the widget listens")).toBe("listens-to");
		expect(edgeKindFromLabel("spawns a projectile")).toBe("spawns");
	});
});

describe("splitBrief", () =>
{
	it("cuts the See it in the editor section into sentences", () =>
	{
		const split = splitBrief("Do the thing.\n\n## See it in the editor\n\nDrag the actor in. Press Play. The label reads 5.");

		expect(split.main).toBe("Do the thing.");
		expect(split.seeItSteps).toEqual(["Drag the actor in.", "Press Play.", "The label reads 5."]);
	});

	it("uses list items when the section is a list, and keeps later sections in the main text", () =>
	{
		const split = splitBrief("Intro\n\n## See it in the editor\n\n- One\n- Two\n\n## Notes\n\nMore");

		expect(split.seeItSteps).toEqual(["One", "Two"]);
		expect(split.main).toContain("## Notes");
	});

	it("leaves a brief without the section whole", () =>
	{
		expect(splitBrief("Only text")).toEqual({ main: "Only text", seeItSteps: [] });
	});
});

describe("marked lines", () =>
{
	it("lists every marked line by file with its code and the key it is saved under", () =>
	{
		const entries = markedLinesOf([{ name: "A.h", starter: "one\n  two\nthree", markedLines: [{ line: 2, reason: "why" }] }, { name: "A.cpp", starter: "x" }]);

		expect(entries).toEqual([{ key: "A.h:2", fileName: "A.h", line: 2, code: "two", reason: "why" }]);
		expect(markedLineKey("A.h", 2)).toBe("A.h:2");
	});
});

describe("quest routes", () =>
{
	it("carry parameters in the hash query and back", () =>
	{
		const hash = hashForRoute("quest", { id: "f1-training-dummy" });

		expect(hash).toBe("#/quest?id=f1-training-dummy");
		expect(routeFromHash(hash).id).toBe("quest");
		expect(routeParametersFromHash(hash)).toEqual({ id: "f1-training-dummy" });
		expect(routeParametersFromHash("#/studio")).toEqual({});
	});

	it("round-trip every drill request", () =>
	{
		for (const request of [{ kind: "due" }, { kind: "test-out", worldId: "w" }, { kind: "parsons-fallback", questId: "q" }] as const)
		{
			expect(drillRequestFromRoute(routeForDrillRequest(request))).toEqual(request);
		}

		expect(drillRequestFromRoute({ kind: "test-out" })).toEqual({ kind: "due" });
	});
});

describe("editor glossary hover matching", () =>
{
	const aliases: GlossaryAlias[] = [
		{ text: "UPROPERTY", entryId: "uproperty", caseSensitive: true, codeOnly: false, short: "s" },
		{ text: "actor", entryId: "actor", caseSensitive: false, codeOnly: false, short: "s" },
	];

	it("finds editor hover words only among identifiers", () =>
	{
		expect(termAtWord("UPROPERTY", aliases)?.entryId).toBe("uproperty");
		expect(termAtWord("actor", aliases)).toBeNull();
	});
});

describe("Parsons marking after a check", () =>
{
	const lines = ["void A()", "{", "x++;", "}"];
	const texts: Record<string, string> = { "line-0": "void A()", "line-1": "{", "line-2": "x++;", "line-3": "}", "distractor-0": "Super::A();" };
	const textOf = (lineId: string): string | undefined => texts[lineId];

	it("marks a decoy without painting every later line", () =>
	{
		expect(misplacedLineIds(["distractor-0", "line-0", "line-1", "line-2", "line-3"], textOf, lines)).toEqual(new Set(["distractor-0"]));
	});

	it("marks only the lines outside the longest in-order run", () =>
	{
		expect(misplacedLineIds(["line-2", "line-0", "line-1", "line-3"], textOf, lines)).toEqual(new Set(["line-2"]));
	});

	it("treats identical lines as interchangeable (A314)", () =>
	{
		const braces = ["{", "{", "}", "}"];
		const braceTexts: Record<string, string> = { "line-0": "{", "line-1": "{", "line-2": "}", "line-3": "}" };

		expect(misplacedLineIds(["line-1", "line-0", "line-3", "line-2"], (lineId) => braceTexts[lineId], braces).size).toBe(0);
	});
});

describe("board columns from the box shape", () =>
{
	it("lays eight pieces out wide in a wide box and tall in a tall one", () =>
	{
		expect(columnsForBox(8, { width: 780, height: 300 })).toBe(4);
		expect(columnsForBox(8, { width: 300, height: 900 })).toBeLessThanOrEqual(2);
		expect(columnsForBox(1, { width: 780, height: 300 })).toBe(1);
		expect(columnsForBox(8)).toBe(2);
	});
});
