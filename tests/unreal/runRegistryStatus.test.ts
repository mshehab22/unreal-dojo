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

		expect(registry.status("run-1")).toMatchObject({ state: "running", lastEvent: { lastLine: "[10/418] Compile" }, eventCount: 2, answer: null });

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
		expect(registry.status("never-started")).toEqual({ runId: "never-started", state: "unknown", lastEvent: null, eventCount: 0, answer: null });
	});

	it("keeps a run that ended early (Submit while it records) as running until its answer is recorded", () =>
	{
		const registry = new RunRegistry();

		registry.begin("submit-1");
		registry.end("submit-1");

		expect(registry.status("submit-1").state).toBe("running");

		registry.recordAnswer("submit-1", { ok: true, value: "recorded" });

		expect(registry.status("submit-1")).toMatchObject({ state: "finished", answer: { ok: true, value: "recorded" } });
	});

	it("reuses the IPC error conversion: a thrown AppError keeps its code, anything else is unexpected", async () =>
	{
		const registry = new RunRegistry();

		await expect(trackRun("run-3", registry, () => undefined, () => Promise.reject(new Error("disk gone")))).rejects.toBeDefined();

		expect(registry.status("run-3")).toMatchObject({ answer: { ok: false, error: { code: "unexpected", detail: "run run-3: disk gone" } } });
	});

	it("logs one line when a run starts and one when its answer is recorded", async () =>
	{
		const lines: string[] = [];
		const registry = new RunRegistry((line) => lines.push(line));

		await trackRun("run-4", registry, () => undefined, () => Promise.resolve("done"));

		expect(lines).toHaveLength(2);
		expect(lines[0]).toBe("[run] run-4 started");
		expect(lines[1]).toMatch(/^\[run\] run-4 answered ok=true after \d+ ms$/);
	});

	it("keeps only the newest finished runs", () =>
	{
		const registry = new RunRegistry();

		for (let index = 0; index < 25; index++) registry.recordAnswer(`run-${index}`, { ok: true, value: index });

		expect(registry.status("run-0").state).toBe("unknown");
		expect(registry.status("run-24").state).toBe("finished");
	});
});
