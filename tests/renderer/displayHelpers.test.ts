// Pure helpers behind the screens: level standing, loop wording (never fast on macOS), formatting, skill groups and names, glossary search, build failure wording, environment chip wording, dismissed notices.
import { describe, expect, it } from "vitest";

import type { GlossaryEntry } from "@shared/types/content";

import { formatDue, formatElapsed, formatMonth, humanizeId, withoutBossPrefix } from "../../src/renderer/src/lib/formatting";
import { levelStanding, xpToNextLevel } from "../../src/renderer/src/lib/levels";
import { describeLoop } from "../../src/renderer/src/lib/loopDescription";
import { hasPointerMoved } from "../../src/renderer/src/lib/pointerMovement";
import { balancedRows, stagesPerRow } from "../../src/renderer/src/lib/pathRows";
import type { AppError } from "@shared/types/errors";

import { dismissNotice, isNoticeDismissed } from "../../src/renderer/src/lib/dismissedNotices";
import { engineChipState, toolchainChipState } from "../../src/renderer/src/lib/environmentChipStates";
import { describeRebuildFailure, describeRebuildRefusal, describeSandboxFailure, explainSandboxFailure } from "../../src/renderer/src/lib/sandboxFailure";
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

	it("words a sandbox set up again from Settings as a first build, pointing at the engine above instead of a setup step (M5.1k)", () =>
	{
		const templateError = explainSandboxFailure(output, "setup-again");
		const general = explainSandboxFailure("something else went wrong", "setup-again");

		expect(templateError.message).toContain("not in anything you wrote");
		expect(templateError.suggestedAction).toContain("pick another engine above");
		expect(templateError.suggestedAction).not.toContain("step 1");
		expect(general.message).toBe("The first build of the sandbox did not finish.");
		expect(describeSandboxFailure({ compilerOutput: output }, "setup-again").code).toBe("sandbox-not-ready");
	});

	it("advises a path too long for Windows by where the learner is: the folder step behind a setup build, the button beside a rebuild (M5.1k)", () =>
	{
		const failure = { code: "sandbox-path-too-long" as const, message: "The build failed because a file path in the sandbox is too long for Windows.", suggestedAction: "Open Settings, choose Set up the sandbox again, and pick a short folder.", detail: "raw line" };

		for (const context of ["first-run", "setup-again"] as const)
		{
			const shown = describeSandboxFailure({ compilerOutput: "", failure }, context);

			expect(shown.suggestedAction, context).toMatch(/^Go back, choose a short folder/);
			expect(shown.suggestedAction, context).not.toContain("Settings");
			expect(shown).toMatchObject({ code: "sandbox-path-too-long", message: failure.message, detail: "raw line" });
		}

		expect(describeRebuildFailure({ compilerOutput: "", failure }).suggestedAction).toMatch(/^Use Set up the sandbox again and choose a short folder/);
	});

	it("words a rebuild refused for a gone sandbox for Settings, and leaves any other error as main sent it (M5.1k)", () =>
	{
		const gone = { code: "sandbox-not-ready" as const, message: "The sandbox project could not be found at C:\\Dojo\\DojoSandbox.", suggestedAction: "Put the folder back, or open Settings and choose Set up the sandbox again.", detail: "C:\\Dojo\\DojoSandbox" };
		const other = { code: "engine-not-found" as const, message: "The Unreal Engine folder is gone.", suggestedAction: "Pick the engine folder again in Settings." };

		expect(describeRebuildRefusal(gone)).toMatchObject({ message: gone.message, detail: gone.detail, suggestedAction: expect.stringContaining("use Set up the sandbox again") });
		expect(describeRebuildRefusal(gone).suggestedAction).not.toContain("open Settings");
		expect(describeRebuildRefusal(other)).toBe(other);
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

describe("describeSandboxFailure", () =>
{
	const explained: AppError = { code: "build-environment-failed", message: "The build tools could not run.", suggestedAction: "Close the editor and build again." };

	it("prefers the explanation the main process sent over any guess from the compiler output", () =>
	{
		expect(describeSandboxFailure({ compilerOutput: "error C2065: undeclared identifier", failure: explained }, "first-run")).toBe(explained);
	});

	it("falls back to the guess from the compiler output when no explanation came", () =>
	{
		const guessed = describeSandboxFailure({ compilerOutput: "error C2065: undeclared identifier" }, "first-run");

		expect(guessed.code).toBe("sandbox-not-ready");
		expect(guessed.message).toContain("compile error inside the sandbox template");
	});
});

describe("describeRebuildFailure", () =>
{
	const explained: AppError = { code: "build-environment-failed", message: "The build tools could not run.", suggestedAction: "Build again.", detail: "UBT exited with code 6." };

	it("keeps both the main process detail and the compiler output reachable", () =>
	{
		expect(describeRebuildFailure({ compilerOutput: "link error LNK1104", failure: explained }).detail).toBe("UBT exited with code 6.\n\nlink error LNK1104");
	});

	it("shows a detail that equals the compiler output once, and the output alone when main sent no detail", () =>
	{
		expect(describeRebuildFailure({ compilerOutput: "UBT exited with code 6.", failure: explained }).detail).toBe("UBT exited with code 6.");
		expect(describeRebuildFailure({ compilerOutput: "link error LNK1104", failure: { ...explained, detail: undefined } }).detail).toBe("link error LNK1104");
		expect(describeRebuildFailure({ compilerOutput: "" }).detail).toBeUndefined();
	});
});

describe("engineChipState", () =>
{
	const engine = { path: "C:\\UE_5.8", version: "5.8.3", source: "launcher" as const, supportsFastLoop: true };
	const problem: AppError = { code: "engine-not-found", message: "The engine folder is gone.", suggestedAction: "Pick it again in Settings." };

	it("says Missing, with the message and action in the tooltip, when the engine in settings has a problem", () =>
	{
		const state = engineChipState({ engine: null, engineProblem: problem });

		expect(state).toMatchObject({ value: "Missing", tone: "fail" });
		expect(state.title).toBe("The engine folder is gone. Pick it again in Settings.");
	});

	it("says Too old, not Missing, when the engine is there but older than the app supports", () =>
	{
		const tooOld: AppError = { code: "engine-version-unsupported", message: "UE 5.2 is older than the oldest supported version.", suggestedAction: "Pick UE 5.4 or later." };

		expect(engineChipState({ engine: null, engineProblem: tooOld })).toMatchObject({ value: "Too old", tone: "fail" });
	});

	it("says Not set only when no engine was ever chosen, and shows the version when the engine works", () =>
	{
		expect(engineChipState({ engine: null })).toMatchObject({ value: "Not set", tone: "fail" });
		expect(engineChipState({ engine, engineProblem: null })).toMatchObject({ value: "UE 5.8.3", tone: "pass", title: "C:\\UE_5.8" });
	});
});

describe("toolchainChipState", () =>
{
	const blocking: AppError = { code: "toolchain-missing", message: "The C++ workload is missing.", suggestedAction: "Install it, then check again." };
	const smaller: AppError = { code: "toolchain-missing", message: "The editor window cannot open.", suggestedAction: "Update the graphics driver." };

	it("shows no chip before any check ran", () =>
	{
		expect(toolchainChipState(null)).toBeNull();
		expect(toolchainChipState(undefined)).toBeNull();
	});

	it("shows OK when nothing is wrong, Blocked for a problem that stops builds, and Warning for a smaller one", () =>
	{
		expect(toolchainChipState({ ok: true, tool: "vswhere", message: "All good.", problems: [] })).toMatchObject({ value: "OK", tone: "pass" });
		expect(toolchainChipState({ ok: false, tool: "vswhere", message: "No.", problems: [{ error: smaller, blocksBuild: false }, { error: blocking, blocksBuild: true }] })).toMatchObject({
			value: "Blocked",
			tone: "fail",
			title: "The C++ workload is missing. Install it, then check again.",
		});
		expect(toolchainChipState({ ok: true, tool: "xcode-select", message: "Mostly.", problems: [{ error: smaller, blocksBuild: false }] })).toMatchObject({ value: "Warning", tone: "warn" });
	});
});

describe("dismissed notices", () =>
{
	it("remembers a dismissed notice by its code and message, and only that one", () =>
	{
		const notice: AppError = { code: "settings-invalid", message: "Your save was restored from the backup.", suggestedAction: "Nothing to do." };
		const other: AppError = { ...notice, message: "Your save could not be read." };

		expect(isNoticeDismissed(notice)).toBe(false);
		dismissNotice(notice);
		expect(isNoticeDismissed({ ...notice, suggestedAction: "Different words." })).toBe(true);
		expect(isNoticeDismissed(other)).toBe(false);
	});
});
