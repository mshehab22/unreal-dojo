// Checks the full-build record: per-quest snapshots, and when sandbox writes outside a run count as a change.
import { describe, expect, it } from "vitest";

import { FullBuildLedger } from "../../src/main/services/unreal/FullBuildLedger";

describe("FullBuildLedger", () =>
{
	it("records a quest's build and the time of the latest build", () =>
	{
		const ledger = new FullBuildLedger();
		ledger.recordBuild("quest-a", { "A.cpp": "a" }, "tests", 10);
		ledger.recordSandboxBuild(20);

		expect(ledger.snapshotFor("quest-a")).toEqual({ files: { "A.cpp": "a" }, tests: "tests", builtAt: 10 });
		expect(ledger.snapshotFor("quest-b")).toBeNull();
		expect(ledger.lastFullBuildAt()).toBe(20);
		expect(ledger.sandboxChangedSinceBuild()).toBe(false);
	});

	it("counts a prerequisite write with new content as a change until the next full build", () =>
	{
		const ledger = new FullBuildLedger();
		ledger.recordSandboxWrite("prerequisite", { "P.h": "v1" });
		ledger.recordBuild("quest-a", { "A.cpp": "a" }, "tests", 10);

		ledger.recordSandboxWrite("prerequisite", { "P.h": "v1" });
		expect(ledger.sandboxChangedSinceBuild()).toBe(false);

		ledger.recordSandboxWrite("prerequisite", { "P.h": "v2" });
		expect(ledger.sandboxChangedSinceBuild()).toBe(true);

		ledger.recordBuild("quest-a", { "A.cpp": "a" }, "tests", 20);
		expect(ledger.sandboxChangedSinceBuild()).toBe(false);
	});

	it("keeps the rest of a folder on a partial write, so restoring one missing file is a change and rewriting a built one is not", () =>
	{
		const ledger = new FullBuildLedger();
		ledger.recordBuild("quest-a", { "A.h": "h", "A.cpp": "cpp" }, "tests", 10);

		ledger.recordSandboxWrite("quest-a", { "A.cpp": "cpp" }, false);
		expect(ledger.sandboxChangedSinceBuild()).toBe(false);

		ledger.recordSandboxWrite("quest-a", { "Extra.h": "x" }, false);
		expect(ledger.sandboxChangedSinceBuild()).toBe(true);
	});

	it("counts a quest reset that removes files, and a write before the first build, as changes", () =>
	{
		const ledger = new FullBuildLedger();
		ledger.recordBuild("quest-a", { "A.cpp": "a" }, "tests", 10);

		ledger.recordSandboxWrite("quest-a", null);
		expect(ledger.sandboxChangedSinceBuild()).toBe(true);

		ledger.recordSandboxBuild(20);
		expect(ledger.sandboxChangedSinceBuild()).toBe(false);

		ledger.recordSandboxWrite("quest-b", { "B.cpp": "b" });
		expect(ledger.sandboxChangedSinceBuild()).toBe(true);
	});
});
