// Checks the verifier: arguments, per-file reports, the --quest filter, the extension point, and the 300-quest time budget.
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { solutionsFolderProblem } from "../../tools/verifier/checkSolutionsFolder";

import { formatReport } from "../../tools/verifier/formatReport";
import { parseVerifierArguments, type VerifierOptions } from "../../tools/verifier/parseVerifierArguments";
import { runVerifier } from "../../tools/verifier/runVerifier";
import { createContentFixture, readExamples, retagQuest, writeLargePack, writePack, writeRepoGlossary, writeWorld, type ContentFixture } from "./contentFixture";

let fixture: ContentFixture;

/** Verifier options pointing at the fixture, with an empty solutions folder and coverage as warnings. */
function defaultOptions(): VerifierOptions
{
	return { contentFolder: fixture.root, solutionsFolder: `${fixture.root}/solutions`, release: false, help: false };
}

beforeEach(async () =>
{
	fixture = await createContentFixture();
});

afterEach(async () =>
{
	await fixture.remove();
});

describe("parseVerifierArguments", () =>
{
	it("reads --pack, --quest, and --content", () =>
	{
		const parsed = parseVerifierArguments(["--pack", "p1", "--quest", "q1", "--content", "/tmp/c"], "default");

		expect(parsed).toEqual({ ok: true, options: { contentFolder: "/tmp/c", solutionsFolder: "", packId: "p1", questId: "q1", release: false, help: false } });
	});

	it("rejects an unknown flag and a flag with no value", () =>
	{
		expect(parseVerifierArguments(["--pak", "p1"], "default")).toEqual({ ok: false, message: "unknown argument \"--pak\"" });
		expect(parseVerifierArguments(["--quest"], "default")).toEqual({ ok: false, message: "--quest needs a value" });
	});
});

describe("runVerifier", () =>
{
	it("runs cleanly on an empty content folder", async () =>
	{
		const result = await runVerifier(defaultOptions());

		expect(result.problemCount).toBe(0);
		expect(formatReport(result).at(-1)).toMatch(/^Checked 0 files .* no problems\.$/);
	});

	it("lists every file and the problems under the file they belong to", async () =>
	{
		const concept = (await readExamples()).get("01-concept-uproperty.md") ?? "";

		await writeRepoGlossary(fixture);
		await writePack(fixture, "p1");
		await writeWorld(fixture, "p1", "01-first");
		await fixture.write("packs/p1/worlds/01-first/01-good.md", retagQuest(concept, "good", 1));
		await fixture.write("packs/p1/worlds/01-first/02-bad.md", retagQuest(concept, "bad", 2).replace("# Card", "# Cards"));

		const result = await runVerifier(defaultOptions());
		const lines = formatReport(result);

		expect(result.problemCount).toBeGreaterThan(0);
		expect(lines).toContain("ok    packs/p1/worlds/01-first/01-good.md");
		expect(lines).toContain("FAIL  packs/p1/worlds/01-first/02-bad.md");
		expect(lines.some((line) => line.includes("Cards") && line.includes("unknown section"))).toBe(true);
	});

	it("reports only the requested quest's file with --quest", async () =>
	{
		const concept = (await readExamples()).get("01-concept-uproperty.md") ?? "";

		await writePack(fixture, "p1");
		await writeWorld(fixture, "p1", "01-first");
		await fixture.write("packs/p1/worlds/01-first/01-a.md", retagQuest(concept, "a", 1));
		await fixture.write("packs/p1/worlds/01-first/02-b.md", retagQuest(concept, "b", 2));

		const result = await runVerifier({ ...defaultOptions(), questId: "b" });

		expect(result.reports.map((report) => report.file)).toEqual(["packs/p1/worlds/01-first/02-b.md"]);
	});

	it("keeps both files with --quest when that quest id is duplicated", async () =>
	{
		const concept = (await readExamples()).get("01-concept-uproperty.md") ?? "";

		await writeRepoGlossary(fixture);
		await writePack(fixture, "p1");
		await writeWorld(fixture, "p1", "01-first");
		await writeWorld(fixture, "p1", "02-second");
		await fixture.write("packs/p1/worlds/01-first/01-a.md", retagQuest(concept, "twin", 1));
		await fixture.write("packs/p1/worlds/02-second/01-b.md", retagQuest(concept, "twin", 1));

		const result = await runVerifier({ ...defaultOptions(), questId: "twin" });

		expect(result.reports.map((report) => report.file)).toEqual(["packs/p1/worlds/01-first/01-a.md", "packs/p1/worlds/02-second/01-b.md"]);
		expect(result.problemCount).toBe(1);
	});

	it("indents the continuation lines of a multi-line message", async () =>
	{
		const check = { name: "multi", run: () => [{ file: "glossary.json", section: "engine", message: "did not build:\nfirst error\nsecond error" }] };
		const lines = formatReport(await runVerifier(defaultOptions(), [check]));

		expect(lines).toContain("      engine: did not build:\n          first error\n          second error");
	});

	it("fails on a world id two packs share (A73)", async () =>
	{
		await writePack(fixture, "first", 1);
		await writePack(fixture, "second", 2);
		await writeWorld(fixture, "first", "01-basics");
		await writeWorld(fixture, "second", "01-basics");

		const result = await runVerifier(defaultOptions(), []);

		expect(result.problemCount).toBe(1);
		expect(formatReport(result)).toContain("FAIL  packs/second/worlds/01-basics/world.json");
	});

	it("runs registered checks after parsing and reports their problems", async () =>
	{
		const check = { name: "always", run: () => [{ file: "glossary.json", message: "from a check" }] };
		const result = await runVerifier({ ...defaultOptions(), help: false }, [check]);

		expect(result.reports).toEqual([{ file: "glossary.json", problems: [{ file: "glossary.json", message: "from a check" }] }]);
	});

	it("parses and checks 300 quests in under 3 seconds", async () =>
	{
		await writeLargePack(fixture, 300);

		// Every content check runs; the generated pack breaks content rules on purpose (no solutions, no unlock chain), so only time and count are asserted.
		const result = await runVerifier(defaultOptions());

		expect(result.counts.quests).toBe(300);
		expect(result.elapsedMilliseconds).toBeLessThan(3000);
	});
});

describe("a scoped run that judges nothing (V1)", () =>
{
	it("fails when --pack names a pack folder that holds no quests", async () =>
	{
		await writePack(fixture, "empty");
		await writeWorld(fixture, "empty", "01-first");

		const result = await runVerifier({ ...defaultOptions(), packId: "empty" });

		expect(result.problemCount).toBe(1);
		expect(formatReport(result).join("\n")).toContain('--pack "empty" judged no quests');
	});

	it("fails when --pack names no pack, and when --quest names no quest", async () =>
	{
		const concept = (await readExamples()).get("01-concept-uproperty.md") ?? "";

		await writePack(fixture, "p1");
		await writeWorld(fixture, "p1", "01-first");
		await fixture.write("packs/p1/worlds/01-first/01-a.md", retagQuest(concept, "a", 1));

		expect((await runVerifier({ ...defaultOptions(), packId: "nope" })).problemCount).toBeGreaterThan(0);
		expect((await runVerifier({ ...defaultOptions(), questId: "nope" })).problemCount).toBeGreaterThan(0);
	});

	it("still passes a scope that judges a clean quest", async () =>
	{
		const concept = (await readExamples()).get("01-concept-uproperty.md") ?? "";

		await writeRepoGlossary(fixture);
		await writePack(fixture, "p1");
		await writeWorld(fixture, "p1", "01-first");
		await fixture.write("packs/p1/worlds/01-first/01-a.md", retagQuest(concept, "a", 1));

		expect((await runVerifier({ ...defaultOptions(), questId: "a" })).problemCount).toBe(0);
		expect((await runVerifier({ ...defaultOptions(), packId: "p1" })).problemCount).toBe(0);
	});
});

describe("solutionsFolderProblem", () =>
{
	it("accepts a folder that exists", async () =>
	{
		expect(await solutionsFolderProblem(fixture.root)).toBeUndefined();
	});

	it("rejects a folder that does not exist, naming the likely cause", async () =>
	{
		const problem = await solutionsFolderProblem(`${fixture.root}/missing`);

		expect(problem).toContain("does not exist");
		expect(problem).toContain("backslash");
	});

	it("rejects a file", async () =>
	{
		await fixture.write("a-file.txt", "x");

		expect(await solutionsFolderProblem(`${fixture.root}/a-file.txt`)).toContain("is not a folder");
	});
});

describe("verify-content command line (V1)", () =>
{
	const run = promisify(execFile);
	const script = resolve("tools/verify-content.ts");

	/** Runs the CLI under tsx and returns its exit code and output. */
	async function cli(args: string[]): Promise<{ code: number; text: string }>
	{
		try
		{
			const { stdout, stderr } = await run(process.execPath, ["--import", "tsx", script, ...args], { cwd: resolve("."), timeout: 60000 });

			return { code: 0, text: stdout + stderr };
		}
		catch (error)
		{
			const failure = error as { code?: number; stdout?: string; stderr?: string };

			return { code: failure.code ?? -1, text: (failure.stdout ?? "") + (failure.stderr ?? "") };
		}
	}

	it("exits non-zero when --solutions points at a folder that does not exist", async () =>
	{
		const result = await cli(["--quest", "f5-interact", "--solutions", `${fixture.root}/no-such-folder`]);

		expect(result.code).toBe(2);
		expect(result.text).toContain("does not exist");
	}, 60000);

	it("exits non-zero when --quest names no quest", async () =>
	{
		const result = await cli(["--quest", "no-such-quest-anywhere"]);

		expect(result.code).toBe(1);
		expect(result.text).toContain("no quest with id");
	}, 60000);

	it("exits non-zero when a scoped quest has no folder in --solutions, and zero for a known-good quest", async () =>
	{
		const missing = await cli(["--quest", "f5-interact", "--solutions", fixture.root]);
		const good = await cli(["--quest", "f5-interact"]);

		expect(missing.code).toBe(1);
		expect(missing.text).toContain("no reference solution");
		expect(good.code).toBe(0);
	}, 120000);
});
