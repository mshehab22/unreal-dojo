// Runs real child processes to check that a run resolves on the process exit, not on the pipes closing, and that killTree reaches grandchildren.
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { NodeProcessLauncher } from "../../src/main/services/unreal/NodeProcessLauncher";
import { PosixProcessTreeKiller } from "../../src/main/services/unreal/PosixProcessTreeKiller";

/** A node script that starts a grandchild holding stdout open for 30 s, prints its id, then exits (like the editor leaving a storage daemon behind). */
const LEAVES_DAEMON = `
const { spawn } = require("node:child_process");
const daemon = spawn(process.execPath, ["-e", "setTimeout(() => {}, 30000)"], { stdio: ["ignore", "inherit", "inherit"] });
console.log("daemon " + daemon.pid);
console.log("partial line without newline at the end");
setTimeout(() => process.exit(7), 100);
`;

/** True when a process with this id is still alive. */
function isAlive(processId: number): boolean
{
	return spawnSync("kill", ["-0", String(processId)]).status === 0;
}

describe.skipIf(process.platform === "win32")("NodeProcessLauncher on macOS", () =>
{
	const launcher = new NodeProcessLauncher(new PosixProcessTreeKiller((processId, signal) => process.kill(processId, signal)));

	it("resolves when the process exits although a grandchild still holds the pipe, then killTree ends the grandchild", async () =>
	{
		const lines: string[] = [];
		const startedAt = Date.now();
		const running = launcher.start({ command: process.execPath, commandArguments: ["-e", LEAVES_DAEMON], verbatimArguments: false }, (line) => lines.push(line));

		const exit = await running.exited;

		expect(exit).toEqual({ exitCode: 7, started: true });
		expect(Date.now() - startedAt).toBeLessThan(10_000);
		expect(lines).toContain("partial line without newline at the end");

		const daemonId = Number(lines.find((line) => line.startsWith("daemon "))?.split(" ")[1]);
		expect(isAlive(daemonId)).toBe(true);

		running.killTree();
		await new Promise((resolve) => setTimeout(resolve, 200));

		expect(isAlive(daemonId)).toBe(false);
	});

	it("reports a program that does not exist", async () =>
	{
		const running = launcher.start({ command: "/no/such/program", commandArguments: [], verbatimArguments: false }, () => undefined);

		const exit = await running.exited;

		expect(exit.started).toBe(false);
		expect(exit.startError).toContain("ENOENT");
	});
});
