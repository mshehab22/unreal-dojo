// Checks the automation report parser against real UE 5.8.3 reports from the M1.2a proof.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ReportParser } from "../../src/main/services/unreal/ReportParser";
import { anchoredTestFilter, declaredTestNames } from "../../src/main/services/unreal/TestFilter";

/** Reads a fixture report as text, keeping its byte order mark. */
function fixture(name: string): string
{
	return readFileSync(join(__dirname, "fixtures", name), "utf8");
}

describe("ReportParser", () =>
{
	const parser = new ReportParser();

	it("reads a passing report that starts with a byte order mark", () =>
	{
		const text = fixture("report-passed.json");
		expect(text.charCodeAt(0)).toBe(0xfeff);

		const report = parser.parse(text);

		expect(report).toEqual({ ok: true, tests: [{ name: "Dojo.Sample.Health.TakesDamage", passed: true, durationMs: 27 }] });
	});

	it("reads a failed test with the assertion text as its message", () =>
	{
		const report = parser.parse(fixture("report-failed.json"));

		expect(report.ok).toBe(true);
		if (!report.ok) return;
		expect(report.tests[0]).toMatchObject({ name: "Dojo.Sample.Health.TakesDamage", passed: false });
		expect(report.tests[0]?.message).toContain("Health clamps at zero");
	});

	it("counts succeeded-with-warnings as passed and explains a not-run test", () =>
	{
		const report = parser.parse(JSON.stringify({ tests: [{ fullTestPath: "Dojo.A.B.Warn", state: "SuccessWithWarnings", duration: 0.5 }, { fullTestPath: "Dojo.A.B.Skip", state: "NotRun" }] }));

		expect(report).toEqual({ ok: true, tests: [{ name: "Dojo.A.B.Warn", passed: true, durationMs: 500 }, { name: "Dojo.A.B.Skip", passed: false, message: "The test did not run." }] });
	});

	it("explains a report that is not JSON or has no tests list", () =>
	{
		expect(parser.parse("{ broken")).toMatchObject({ ok: false });
		expect(parser.parse("{}")).toEqual({ ok: false, problem: "The test report has no tests list." });
	});
});

describe("test names and the exact filter", () =>
{
	it("lists every declared test name, and none for a source without tests", () =>
	{
		const source = `IMPLEMENT_SIMPLE_AUTOMATION_TEST(FA, "Dojo.W1.Health.TakesDamage", Flags)\nIMPLEMENT_COMPLEX_AUTOMATION_TEST( FB , "Dojo.W1.Health.Heals", Flags)`;

		expect(declaredTestNames(source)).toEqual(["Dojo.W1.Health.TakesDamage", "Dojo.W1.Health.Heals"]);
		expect(declaredTestNames("// nothing here")).toEqual([]);
	});

	it("anchors each name at both ends where the platform allows a $, and at the start only otherwise", () =>
	{
		expect(anchoredTestFilter(["Dojo.W1.Health.TakesDamage"], "$")).toBe("^Dojo.W1.Health.TakesDamage$");
		expect(anchoredTestFilter(["Dojo.W1.Health.Heals", "Dojo.W1.Health.HealsTwice"], "$")).toBe("^Dojo.W1.Health.Heals$+^Dojo.W1.Health.HealsTwice$");
		expect(anchoredTestFilter(["Dojo.W1.Health.Heals", "Dojo.W1.Health.HealsTwice"], "")).toBe("^Dojo.W1.Health.Heals+^Dojo.W1.Health.HealsTwice");
	});
});
