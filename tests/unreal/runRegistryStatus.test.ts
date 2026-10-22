// Main remembers each run's last progress event and how it ended, so `getRunStatus` can answer a window that missed them (A820).
import { describe, expect, it } from "vitest";

import type { BuildProgressEvent } from "@shared/types/run";

import { AppErrorException } from "../../src/main/errors/AppErrorException";
import { trackRun } from "../../src/main/ipc/trackRun";
import { RunRegistry } from "../../src/main/services/unreal/RunRegistry";

describe("RunRegistry status", () =>
{
	it("reports a running run with its last event, then the finished answer after it ends", async () =>
	{
		const registry = new RunRegistry();
		const sent: BuildProgressEvent[] = [];
		let finish: (value: string) => void = () => undefined;
		let reportProgress: (line: string) => void = () => undefined;

		const running = trackRun("run-1", registry, (event) => sent.push(event), (onProgress) =>
		{
			reportProgress = (line) => onProgress({ phase: "building", lastLine: line });

			return new Promise<string>((resolve) => (finish = resolve));
		});

		reportProgress("Starting the first full build");
		reportProgress("[10/418] Compile");

		expect(registry.status("run-1")).toMatchObject({ state: "running", lastEvent: { lastLine: "[10/418] Compile" }, answer: null });

		finish("done");
		await running;

		expect(registry.status("run-1")).toMatchObject({ state: "finished", lastEvent: { lastLine: "[10/418] Compile" }, answer: { ok: true, value: "done" } });
		expect(sent).toHaveLength(2);
	});

	it("remembers a failure as its AppError and answers unknown for an id it never saw", async () =>
	{
		const registry = new RunRegistry();

		await expect(trackRun("run-2", registry, () => undefined, () => Promise.reject(new AppErrorException("sandbox-copy-failed", "Could not copy.", "Pick another folder.")))).rejects.toBeDefined();

		expect(registry.status("run-2")).toMatchObject({ state: "finished", answer: { ok: false, error: { code: "sandbox-copy-failed" } } });
		expect(registry.status("never-started")).toEqual({ runId: "never-started", state: "unknown", lastEvent: null, answer: null });
	});

	it("keeps only the newest finished runs", () =>
	{
		const registry = new RunRegistry();

		for (let index = 0; index < 25; index++) registry.recordAnswer(`run-${index}`, { ok: true, value: index });

		expect(registry.status("run-0").state).toBe("unknown");
		expect(registry.status("run-24").state).toBe("finished");
	});
});
