// Runs real child processes to check that a run resolves on the process exit, not on the pipes closing, and that killTree reaches grandchildren.
import { spawn, spawnSync, type SpawnOptions } from "node:child_process";

import { describe, expect, it } from "vitest";

import { NodeCommandRunner } from "../../src/main/services/unreal/NodeCommandRunner";
import { NodeProcessLauncher, type SpawnFunction } from "../../src/main/services/unreal/NodeProcessLauncher";
import { PosixProcessTreeKiller } from "../../src/main/services/unreal/PosixProcessTreeKiller";
import { WindowsProcessTreeKiller } from "../../src/main/services/unreal/WindowsProcessTreeKiller";

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

describe("NodeProcessLauncher spawn options", () =>
{
	/** Records the spawn call and answers with a process that never starts. */
	function recordSpawn(verbatimArguments: boolean): { command: string; commandArguments: string[]; options: SpawnOptions }
	{
		let recorded: { command: string; commandArguments: string[]; options: SpawnOptions } | null = null;
		const fakeSpawn: SpawnFunction = (command, commandArguments, options) =>
		{
			recorded = { command, commandArguments, options };

			return spawn("/no/such/program", [], { stdio: ["ignore", "pipe", "pipe"] });
		};

		const launcher = new NodeProcessLauncher(new WindowsProcessTreeKiller(() => undefined), fakeSpawn);
		launcher.start({ command: "C:\\Program Files\\Epic Games\\UE_5.8\\Engine\\Binaries\\Win64\\UnrealEditor-Cmd.exe", commandArguments: ["\"C:\\Dojo\\Dojo.uproject\""], verbatimArguments }, () => undefined);

		if (!recorded) throw new Error("spawn was not called");

		return recorded;
	}

	it("quotes the program path in argv0 when arguments are verbatim, so a path with spaces stays one argument", () =>
	{
		const call = recordSpawn(true);

		expect(call.options.argv0).toBe("\"C:\\Program Files\\Epic Games\\UE_5.8\\Engine\\Binaries\\Win64\\UnrealEditor-Cmd.exe\"");
		expect(call.options.windowsVerbatimArguments).toBe(true);
		expect(call.options.shell).toBe(false);
		expect(call.options.stdio).toEqual(["ignore", "pipe", "pipe"]);
	});

	it("leaves argv0 alone when arguments are passed whole", () =>
	{
		expect(recordSpawn(false).options.argv0).toBeUndefined();
	});
});

describe.skipIf(process.platform === "win32")("NodeCommandRunner time limit", () =>
{
	/** A node script that starts a grandchild holding stderr open, prints its id, and then blocks itself too (like xcrun waiting on a stuck clang -cc1). */
	const BLOCKS = `
const { spawn } = require("node:child_process");
const stuck = spawn(process.execPath, ["-e", "setTimeout(() => {}, 30000)"], { stdio: ["ignore", "inherit", "inherit"] });
console.error("stuck " + stuck.pid);
setTimeout(() => {}, 30000);
`;

	it("kills the whole tree on the time limit and answers at once with no exit code", async () =>
	{
		const runner = new NodeCommandRunner(new PosixProcessTreeKiller((processId, signal) => process.kill(processId, signal)), 500);
		const startedAt = Date.now();

		const result = await runner.run(process.execPath, ["-e", BLOCKS]);

		expect(Date.now() - startedAt).toBeLessThan(3000);
		expect(result).toMatchObject({ started: true, exitCode: null });

		const stuckId = Number(/stuck (\d+)/.exec(result.stderr)?.[1]);
		await new Promise((resolve) => setTimeout(resolve, 200));

		expect(stuckId).toBeGreaterThan(0);
		expect(isAlive(stuckId)).toBe(false);
	});

	it("still answers a quick command normally", async () =>
	{
		const result = await new NodeCommandRunner().run(process.execPath, ["-e", "process.stdout.write('hi'); process.exit(3)"]);

		expect(result).toEqual({ started: true, exitCode: 3, stdout: "hi", stderr: "" });
	});
});
