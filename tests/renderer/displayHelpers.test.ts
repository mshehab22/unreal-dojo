// Pure helpers behind the screens: level standing, loop wording (never fast on macOS), formatting, skill groups and names, glossary search, build failure wording.
import { describe, expect, it } from "vitest";

import type { GlossaryEntry } from "@shared/types/content";

import { formatDue, formatElapsed, formatMonth, humanizeId, withoutBossPrefix } from "../../src/renderer/src/lib/formatting";
import { levelStanding, xpToNextLevel } from "../../src/renderer/src/lib/levels";
import { describeLoop } from "../../src/renderer/src/lib/loopDescription";
import { hasPointerMoved } from "../../src/renderer/src/lib/pointerMovement";
import { balancedRows, stagesPerRow } from "../../src/renderer/src/lib/pathRows";
import { explainSandboxFailure } from "../../src/renderer/src/lib/sandboxFailure";
import { groupSkills, skillPrefix } from "../../src/renderer/src/lib/skillGroups";
import { skillGroupName, skillLabel } from "../../src/renderer/src/lib/skillNames";
import { searchGlossary } from "../../src/renderer/src/lib/searchGlossary";

/** A rules snapshot fragment, as getRules would answer it in a test. */
const RULES = { levelCurveBase: 200, levelCurveGrowth: 1.35, roles: [{ level: 1, name: "Apprentice" }, { level: 4, name: "Scripter" }, { level: 8, name: "Builder" }] };

describe("levelStanding", () =>
{
	it("starts at level 1 with nothing earned", () =>
	{
		expect(levelStanding(0, RULES)).toMatchObject({ level: 1, role: "Apprentice", xpIntoLevel: 0, xpForNextLevel: 200, nextRole: { name: "Scripter", level: 4 } });
	});

	it("walks the curve from the rules", () =>
	{
		expect(xpToNextLevel(2, RULES)).toBe(270);
		expect(levelStanding(200, RULES).level).toBe(2);
		expect(levelStanding(1240, RULES)).toMatchObject({ level: 4, role: "Scripter", xpIntoLevel: 405, xpForNextLevel: 492 });
	});
});

describe("describeLoop", () =>
{
	const engine58 = { version: "5.8.3", supportsFastLoop: true };
	const engine56 = { version: "5.6.1", supportsFastLoop: false };

	it("never promises the fast loop on macOS, even for 5.8 (A45)", () =>
	{
		expect(describeLoop(engine58, "auto", true).isFast).toBe(false);
		expect(describeLoop(engine58, "fast", true).label).toBe("Headless loop");
	});

	it("offers the fast loop on Windows with 5.8 only", () =>
	{
		expect(describeLoop(engine58, "auto", false).isFast).toBe(true);
		expect(describeLoop(engine56, "auto", false).isFast).toBe(false);
		expect(describeLoop(engine58, "headless", false).isFast).toBe(false);
	});

	it("says there is no engine when none is set", () =>
	{
		expect(describeLoop(null, "auto", false).label).toBe("No engine");
	});
});

describe("formatting", () =>
{
	it("formats elapsed time", () =>
	{
		expect(formatElapsed(0)).toBe("0:00");
		expect(formatElapsed(192_000)).toBe("3:12");
		expect(formatElapsed(3_723_000)).toBe("1:02:03");
	});

	it("formats due times relative to now", () =>
	{
		const now = new Date("2026-10-21T12:00:00Z");

		expect(formatDue("2026-10-21T12:10:00Z", now)).toBe("now");
		expect(formatDue("2026-10-21T15:00:00Z", now)).toBe("in 3 hours");
		expect(formatDue("2026-10-22T12:00:00Z", now)).toBe("tomorrow");
		expect(formatDue("2026-10-26T12:00:00Z", now)).toBe("in 5 days");
		expect(formatDue("2026-10-18T12:00:00Z", now)).toBe("3 days ago");
	});

	it("turns ids into words", () =>
	{
		expect(humanizeId("night-market-lighting")).toBe("Night market lighting");
	});

	it("drops the boss prefix and starts with a capital", () =>
	{
		expect(withoutBossPrefix("Boss: the training yard")).toBe("The training yard");
		expect(withoutBossPrefix("Plan a dash")).toBe("Plan a dash");
	});

	it("writes months out", () =>
	{
		expect(formatMonth("2026-09")).toBe("September 2026");
	});
});

describe("groupSkills", () =>
{
	it("groups by the two-part prefix and sorts", () =>
	{
		expect(skillPrefix("ue.objects.uproperty")).toBe("ue.objects");
		expect(skillPrefix("reflection")).toBe("reflection");

		const groups = groupSkills({
			"ue.objects.uproperty": { points: 3, mastery: "mastered" },
			"breakdown.decompose": { points: 1, mastery: "familiar" },
			"ue.objects.actors": { points: 2, mastery: "attempted" },
		});

		expect(groups.map((group) => group.prefix)).toEqual(["breakdown", "ue.objects"]);
		expect(groups[1]?.skills.map((skill) => skill.label)).toEqual(["actors", "uproperty"]);
	});
});

describe("searchGlossary", () =>
{
	/** A minimal glossary entry. */
	const entry = (id: string, term: string, aliases: string[] = [], short = ""): GlossaryEntry => ({ id, term, aliases, category: "reflection", short, long: "", unrealDocsUrl: "", related: [] });
	const entries = [entry("uproperty", "UPROPERTY"), entry("uclass", "UCLASS", ["Unreal class"]), entry("tarray", "TArray", [], "A resizable array of properties")];

	it("ranks exact and prefix matches above words in the definition", () =>
	{
		expect(searchGlossary(entries, "prop").map((found) => found.id)).toEqual(["uproperty", "tarray"]);
		expect(searchGlossary(entries, "unreal class")[0]?.id).toBe("uclass");
	});

	it("lists everything by term for an empty query", () =>
	{
		expect(searchGlossary(entries, "  ").map((found) => found.id)).toEqual(["tarray", "uclass", "uproperty"]);
	});
});

describe("skill names", () =>
{
	it("reads branch prefixes and skill ids as words", () =>
	{
		expect(skillGroupName("ue.objects")).toBe("Objects");
		expect(skillGroupName("breakdown")).toBe("Breakdown");
		expect(skillLabel("soft-refs")).toBe("Soft refs");
		expect(skillLabel("gc")).toBe("GC");
	});
});

describe("explainSandboxFailure", () =>
{
	const output = "DojoTestActor.cpp(14): error C2065: 'UStaticMeshComponent': undeclared identifier";

	it("blames the template on a first build", () =>
	{
		expect(explainSandboxFailure(output, "first-run").message).toContain("not in anything you wrote");
	});

	it("names another open editor with Live Coding as the cause, on both a first build and a rebuild", () =>
	{
		const pipelineMessage = "Unreal refused to build because an Unreal editor with Live Coding is open. Close the other Unreal editor, then run again. Your code was not compiled.";
		const rawLine = "Unable to build while Live Coding is active. Exit the editor and game, or press Ctrl+Alt+F11 if iterating on code in the editor or game";

		for (const context of ["first-run", "rebuild"] as const)
		{
			expect(explainSandboxFailure(`${pipelineMessage}
${rawLine}`, context).message).toContain("another Unreal editor with Live Coding is open");
			expect(explainSandboxFailure(rawLine, context).suggestedAction).toContain("Close the other Unreal editor");
		}
	});

	it("never mentions setup steps on a rebuild", () =>
	{
		const explanation = explainSandboxFailure(output, "rebuild");

		expect(`${explanation.message} ${explanation.suggestedAction}`).not.toMatch(/step 1|not in anything you wrote/);
	});
});

describe("path rows", () =>
{
	it("fits as many stages as the width allows, at least one", () =>
	{
		expect(stagesPerRow(700)).toBe(7);
		expect(stagesPerRow(40)).toBe(1);
		expect(stagesPerRow(0)).toBeGreaterThan(0);
	});

	it("splits a 12-stage world into balanced rows that never exceed the limit", () =>
	{
		const stages = Array.from({ length: 12 }, (_unused, index) => index);

		expect(balancedRows(stages, 7).map((row) => row.length)).toEqual([6, 6]);
		expect(balancedRows(stages, 12).map((row) => row.length)).toEqual([12]);
		expect(balancedRows(stages, 5).map((row) => row.length)).toEqual([4, 4, 4]);
		expect(balancedRows([], 5)).toEqual([]);
	});
});

describe("hasPointerMoved", () =>
{
	it("never counts the first position, which only records where the pointer rests", () =>
	{
		expect(hasPointerMoved(null, { x: 10, y: 20 })).toBe(false);
	});

	it("ignores events from content moving under a still pointer and counts real moves", () =>
	{
		expect(hasPointerMoved({ x: 10, y: 20 }, { x: 10, y: 20 })).toBe(false);
		expect(hasPointerMoved({ x: 10, y: 20 }, { x: 11, y: 20 })).toBe(true);
	});
});
