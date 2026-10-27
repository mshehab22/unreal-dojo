// Checks the "no process left behind" helper on this platform: it finds a live process by a folder on its command line (in the short or the long spelling of the path), never finds its own query, and finds nothing once the process is gone.
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { otherSpelling, processesMentioning } from "./processesMentioning";

describe("processesMentioning", () =>
{
	it("finds a process whose command line mentions the folder, not its own query, and nothing after the process ends", async () =>
	{
		const folder = `dojo-process-query-${process.pid}-${Date.now()}`;
		const child = spawn(process.execPath, ["-e", "setTimeout(() => undefined, 60000)", folder], { stdio: "ignore", windowsHide: true });

		try
		{
			await once(child, "spawn");

			const found = processesMentioning(folder);

			expect(found).toContain(folder);
			expect(found.split(/\r?\n/)).toHaveLength(1);
		}
		finally
		{
			child.kill();
			await once(child, "exit");
		}

		expect(processesMentioning(folder)).toBe("");
	}, 60_000);

	it("finds a process started with the other spelling of the folder (the 8.3 short form against the long form on Windows)", async () =>
	{
		const folder = mkdtempSync(join(tmpdir(), "dojo-process-query-"));
		const other = otherSpelling(folder);
		// Where the machine has one spelling only, both spellings are the same and the test still checks a plain match.
		const startedWith = other === "" ? folder : other;
		const child = spawn(process.execPath, ["-e", "setTimeout(() => undefined, 60000)", startedWith], { stdio: "ignore", windowsHide: true });

		try
		{
			await once(child, "spawn");

			expect(processesMentioning(folder)).toContain(startedWith);
			expect(processesMentioning(startedWith)).toContain(startedWith);
		}
		finally
		{
			child.kill();
			await once(child, "exit");
			rmSync(folder, { recursive: true, force: true });
		}
	}, 60_000);
});
