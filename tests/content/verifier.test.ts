// Checks the verifier: arguments, per-file reports, the --quest filter, the extension point, and the 300-quest time budget.
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { formatReport } from "../../tools/verifier/formatReport";
import { parseVerifierArguments } from "../../tools/verifier/parseVerifierArguments";
import { runVerifier } from "../../tools/verifier/runVerifier";
import { createContentFixture, readExamples, retagQuest, writeLargePack, writePack, writeWorld, type ContentFixture } from "./contentFixture";

let fixture: ContentFixture;

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

		expect(parsed).toEqual({ ok: true, options: { contentFolder: "/tmp/c", packId: "p1", questId: "q1", help: false } });
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
		const result = await runVerifier({ contentFolder: fixture.root, help: false });

		expect(result.problemCount).toBe(0);
		expect(formatReport(result).at(-1)).toMatch(/^Parsed 0 files .* no problems\.$/);
	});

	it("lists every file and the problems under the file they belong to", async () =>
	{
		const concept = (await readExamples()).get("01-concept-uproperty.md") ?? "";

		await writePack(fixture, "p1");
		await writeWorld(fixture, "p1", "01-first");
		await fixture.write("packs/p1/worlds/01-first/01-good.md", retagQuest(concept, "good", 1));
		await fixture.write("packs/p1/worlds/01-first/02-bad.md", retagQuest(concept, "bad", 2).replace("# Card", "# Cards"));

		const result = await runVerifier({ contentFolder: fixture.root, help: false });
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

		const result = await runVerifier({ contentFolder: fixture.root, questId: "b", help: false });

		expect(result.reports.map((report) => report.file)).toEqual(["packs/p1/worlds/01-first/02-b.md"]);
	});

	it("runs registered checks after parsing and reports their problems", async () =>
	{
		const check = { name: "always", run: () => [{ file: "glossary.json", message: "from a check" }] };
		const result = await runVerifier({ contentFolder: fixture.root, help: false }, [check]);

		expect(result.reports).toEqual([{ file: "glossary.json", problems: [{ file: "glossary.json", message: "from a check" }] }]);
	});

	it("parses 300 quests in under 3 seconds", async () =>
	{
		await writeLargePack(fixture, 300);

		const result = await runVerifier({ contentFolder: fixture.root, help: false });

		expect(result.problemCount).toBe(0);
		expect(result.counts.quests).toBe(300);
		expect(result.elapsedMilliseconds).toBeLessThan(3000);
	});
});
