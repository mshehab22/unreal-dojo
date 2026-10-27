// Checks the timeout evidence helper without an engine: it copies a sandbox's Saved/Logs to a named kept folder, reports the editor state, and never throws when there is nothing to copy.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { keepEditorTimeoutEvidence } from "./keepEditorTimeoutEvidence";

/** A fixed process list so the tests never run the real, slow process query. */
const fakeProcessList = "UnrealEditor.exe 1234";

describe("keepEditorTimeoutEvidence", () =>
{
	let workFolder = "";

	beforeEach(() =>
	{
		workFolder = mkdtempSync(join(tmpdir(), "dojo-evidence-test-"));
	});

	afterEach(() =>
	{
		rmSync(workFolder, { recursive: true, force: true });
	});

	it("copies Saved/Logs into dojo-reopen-timeout-<label>-<timestamp> and says where, with the editor state", async () =>
	{
		const sandboxFolder = join(workFolder, "sandbox");
		const keepRoot = join(workFolder, "kept");
		mkdirSync(join(sandboxFolder, "Saved", "Logs", "nested"), { recursive: true });
		writeFileSync(join(sandboxFolder, "Saved", "Logs", "Dojo.log"), "editor log line\n");
		writeFileSync(join(sandboxFolder, "Saved", "Logs", "nested", "Crash.log"), "nested line\n");

		const message = await keepEditorTimeoutEvidence({ sandboxFolder, label: "after cpp/change", sessionState: "running", keepRoot, now: () => new Date("2026-10-27T10:20:30.456Z"), findProcesses: () => fakeProcessList });
		const keptFolder = join(keepRoot, "dojo-reopen-timeout-after-cpp-change-2026-10-27T10-20-30-456Z");

		expect(message).toContain(keptFolder);
		expect(message).toContain("Editor session: running");
		expect(message).toContain(fakeProcessList);
		expect(readFileSync(join(keptFolder, "Dojo.log"), "utf8")).toBe("editor log line\n");
		expect(readFileSync(join(keptFolder, "nested", "Crash.log"), "utf8")).toBe("nested line\n");
		expect(existsSync(join(sandboxFolder, "Saved", "Logs", "Dojo.log"))).toBe(true);
	});

	it("reports the failure instead of throwing when the sandbox has no Saved/Logs", async () =>
	{
		const sandboxFolder = join(workFolder, "empty-sandbox");
		mkdirSync(sandboxFolder);

		const message = await keepEditorTimeoutEvidence({ sandboxFolder, label: "no-logs", sessionState: "no session", keepRoot: join(workFolder, "kept"), findProcesses: () => fakeProcessList });

		expect(message).toContain("Editor session: no session");
		expect(message).toContain(fakeProcessList);
		expect(message).toContain("could not be kept");
	});
});
