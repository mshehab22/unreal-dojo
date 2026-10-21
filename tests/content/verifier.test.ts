// Checks the verifier: arguments, per-file reports, the --quest filter, the extension point, and the 300-quest time budget.
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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
