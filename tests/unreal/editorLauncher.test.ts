// Checks the editor's command line on both platforms, one editor at a time, waiting for the server, and the two-step close.
import { describe, expect, it } from "vitest";

import { CLOSE_GRACE_MS, EditorLauncher } from "../../src/main/services/unreal/EditorLauncher";
import { MacPlatformPaths } from "../../src/main/services/unreal/MacPlatformPaths";
import type { PlatformPaths } from "../../src/main/services/unreal/PlatformPaths";
import { WindowsPlatformPaths } from "../../src/main/services/unreal/WindowsPlatformPaths";
import { FakeEditorToolClient } from "./FakeEditorToolClient";
import { FakeProcessLauncher } from "./FakeProcessLauncher";
import { FakeTimer } from "./FakeTimer";

const MAC_ENGINE = "/Users/learner/Applications/UE_5.8";
const MAC_PROJECT = "/Users/learner/Dojo/DojoSandbox/Dojo.uproject";

/** A launcher over hanging fake editors, recording each client it makes. */
function createLauncher(paths: PlatformPaths = new MacPlatformPaths("/Users/learner"))
{
	const processes = new FakeProcessLauncher([{ hangs: true }, { hangs: true }, { hangs: true }]);
	const timer = new FakeTimer();
	const clients: FakeEditorToolClient[] = [];
	const launcher = new EditorLauncher({ paths, launcher: processes, timer, createClient: () =>
	{
		const client = new FakeEditorToolClient();
		clients.push(client);

		return client;
	} });

	return { launcher, processes, timer, clients };
}

/** Lets pending promise callbacks run. */
async function settle(): Promise<void>
{
	for (let step = 0; step < 5; step++) await Promise.resolve();
}

describe("EditorLauncher", () =>
{
	it("starts the Mac editor binary with the MCP server on the port", async () =>
	{
		const { launcher, processes } = createLauncher();
		const session = await launcher.launch({ engineRoot: MAC_ENGINE, projectFile: MAC_PROJECT, port: 8010, startMcpServer: true, windowless: false });

		expect(processes.specs[0]).toEqual({
			command: `${MAC_ENGINE}/Engine/Binaries/Mac/UnrealEditor.app/Contents/MacOS/UnrealEditor`,
			commandArguments: [MAC_PROJECT, "-ModelContextProtocolStartServer", "-ModelContextProtocolPort=8010"],
			verbatimArguments: false,
		});
		expect(session.port).toBe(8010);
		expect(launcher.current()).toBe(session);
	});

	it("adds the windowless flags and leaves out the MCP server for older engines", () =>
	{
		const { launcher } = createLauncher();

		expect(launcher.commandArguments({ projectFile: MAC_PROJECT, port: 8000, startMcpServer: false, windowless: true })).toEqual([MAC_PROJECT, "-NullRHI", "-Unattended", "-NoSplash", "-NoSound", "-stdout", "-FullStdOutLogOutput"]);
	});

	it("quotes the Windows arguments and starts UnrealEditor.exe", async () =>
	{
		const { launcher, processes } = createLauncher(new WindowsPlatformPaths({}));
		await launcher.launch({ engineRoot: "C:\\Epic\\UE_5.8", projectFile: "C:\\Dojo\\DojoSandbox\\Dojo.uproject", port: 8000, startMcpServer: true, windowless: false });

		expect(processes.specs[0]?.command).toBe("C:\\Epic\\UE_5.8\\Engine\\Binaries\\Win64\\UnrealEditor.exe");
		expect(processes.specs[0]?.commandArguments).toEqual(["\"C:\\Dojo\\DojoSandbox\\Dojo.uproject\"", "-ModelContextProtocolStartServer", "-ModelContextProtocolPort=\"8000\""]);
		expect(processes.specs[0]?.verbatimArguments).toBe(true);
	});

	it("closes with an exit request and no kill when the editor quits in time", async () =>
	{
		const { launcher, processes, clients } = createLauncher();
		await launcher.launch({ engineRoot: MAC_ENGINE, projectFile: MAC_PROJECT, port: 8000, startMcpServer: true, windowless: true });

		await launcher.close();

		expect(processes.exitRequestCount).toBe(1);
		expect(processes.killCount).toBe(0);
		expect(clients[0]?.calls).toContain("close");
		expect(launcher.current()).toBeNull();
	});

	it("kills the tree 15 seconds after the exit request when the editor hangs in shutdown", async () =>
	{
		const { launcher, processes, timer } = createLauncher();
		processes.honorsExitRequests = false;
		await launcher.launch({ engineRoot: MAC_ENGINE, projectFile: MAC_PROJECT, port: 8000, startMcpServer: true, windowless: true });

		let closed = false;
		const closing = launcher.close().then(() => (closed = true));
		await settle();

		timer.advance(CLOSE_GRACE_MS - 1);
		await settle();
		expect(closed).toBe(false);
		expect(processes.killCount).toBe(0);

		timer.advance(1);
		await closing;
		expect(processes.killCount).toBe(1);
	});

	it("closes the old editor before opening another, and reopens the last one on request", async () =>
	{
		const { launcher, processes } = createLauncher();
		const first = await launcher.launch({ engineRoot: MAC_ENGINE, projectFile: MAC_PROJECT, port: 8000, startMcpServer: true, windowless: false });
		await launcher.launch({ engineRoot: MAC_ENGINE, projectFile: MAC_PROJECT, port: 8001, startMcpServer: true, windowless: false });

		expect(first.isRunning()).toBe(false);
		expect(processes.exitRequestCount).toBe(1);

		const reopened = await launcher.reopen();

		expect(reopened?.port).toBe(8001);
		expect(processes.specs).toHaveLength(3);
	});

	it("waits until the server answers, polling once a second", async () =>
	{
		const { launcher, timer, clients } = createLauncher();
		const session = await launcher.launch({ engineRoot: MAC_ENGINE, projectFile: MAC_PROJECT, port: 8000, startMcpServer: true, windowless: true });
		const client = clients[0]!;
		client.answering = false;

		let answer: boolean | null = null;
		void launcher.waitUntilAnswering(session, 60_000).then((value) => (answer = value));
		await settle();

		timer.advance(1_000);
		await settle();
		client.answering = true;
		timer.advance(1_000);
		await settle();

		expect(answer).toBe(true);
		expect(client.calls.filter((call) => call === "isAnswering")).toHaveLength(3);
	});

	it("gives up waiting when the time runs out", async () =>
	{
		const { launcher, timer, clients } = createLauncher();
		const session = await launcher.launch({ engineRoot: MAC_ENGINE, projectFile: MAC_PROJECT, port: 8000, startMcpServer: true, windowless: true });
		clients[0]!.answering = false;

		let answer: boolean | null = null;
		void launcher.waitUntilAnswering(session, 2_500).then((value) => (answer = value));

		for (let second = 0; second < 3; second++)
		{
			await settle();
			timer.advance(1_000);
		}

		await settle();
		expect(answer).toBe(false);
	});
});
