// Checks the "no process left behind" helper on this platform: it finds a live process by a folder on its command line, never finds its own query, and finds nothing once the process is gone.
import { spawn } from "node:child_process";
import { once } from "node:events";

import { describe, expect, it } from "vitest";

import { processesMentioning } from "./processesMentioning";

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
});
