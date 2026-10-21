// The real process runner against small Node scripts: stdin and stdout, exit codes, timeout, cancel, and a missing command.
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { NodeProcessRunner } from "../../src/main/services/review/providers/NodeProcessRunner";

/** Runs a Node one-liner through the runner. */
function runNode(script: string, options: { stdin?: string; timeoutMs?: number; signal?: AbortSignal } = {})
{
	return new NodeProcessRunner().run(process.execPath, ["-e", script], { cwd: tmpdir(), stdin: options.stdin, timeoutMs: options.timeoutMs ?? 10_000, signal: options.signal });
}

describe("NodeProcessRunner", () =>
{
	it("writes stdin and collects stdout, stderr, and the exit code", async () =>
	{
		const result = await runNode("let t='';process.stdin.on('data',d=>t+=d).on('end',()=>{process.stdout.write(t.toUpperCase());process.stderr.write('warn');process.exit(3);});", { stdin: "hello" });

		expect(result).toEqual({ exitCode: 3, stdout: "HELLO", stderr: "warn", timedOut: false, cancelled: false });
	});

	it("stops a process that runs past the timeout", async () =>
	{
		const result = await runNode("setInterval(()=>{},1000);", { timeoutMs: 200 });

		expect(result.timedOut).toBe(true);
		expect(result.cancelled).toBe(false);
	});

	it("stops a process when the signal aborts", async () =>
	{
		const controller = new AbortController();
		setTimeout(() => controller.abort(), 150);

		const result = await runNode("setInterval(()=>{},1000);", { signal: controller.signal });

		expect(result.cancelled).toBe(true);
	});

	it("reports a command that does not exist instead of throwing", async () =>
	{
		const result = await new NodeProcessRunner().run("/no/such/claude", [], { cwd: tmpdir(), timeoutMs: 1000 });

		expect(result.exitCode).toBeNull();
		expect(result.stderr).toMatch(/ENOENT/);
	});
});
