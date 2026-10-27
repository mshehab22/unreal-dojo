// Checks the editor's command line on both platforms, one editor at a time, waiting for the server, and the two-step close.
import { describe, expect, it } from "vitest";

import { AppErrorException } from "../../src/main/errors/AppErrorException";
import { CLOSE_GRACE_MS, EditorLauncher } from "../../src/main/services/unreal/EditorLauncher";
import { NodePortProbe } from "../../src/main/services/unreal/NodePortProbe";
import { MacPlatformPaths } from "../../src/main/services/unreal/MacPlatformPaths";
import type { PlatformPaths } from "../../src/main/services/unreal/PlatformPaths";
import { WindowsPlatformPaths } from "../../src/main/services/unreal/WindowsPlatformPaths";
import { FakeEditorToolClient } from "./FakeEditorToolClient";
import { FakeProcessLauncher } from "./FakeProcessLauncher";
import { FakeTimer } from "./FakeTimer";
import { FakeUnrealMcpServer } from "./FakeUnrealMcpServer";

const MAC_ENGINE = "/Users/learner/Applications/UE_5.8";
const MAC_PROJECT = "/Users/learner/Dojo/DojoSandbox/Dojo.uproject";

/** A launcher over hanging fake editors, recording each client it makes. */
function createLauncher(paths: PlatformPaths = new MacPlatformPaths("/Users/learner"))
{
	const processes = new FakeProcessLauncher([{ hangs: true }, { hangs: true }, { hangs: true }]);
	const timer = new FakeTimer();
	const clients: FakeEditorToolClient[] = [];
	const portProbe = { inUse: false, isInUse: async () => portProbe.inUse };
	const launcher = new EditorLauncher({ paths, launcher: processes, timer, portProbe, createClient: () =>
	{
		const client = new FakeEditorToolClient();
		clients.push(client);

		return client;
	} });

	return { launcher, processes, timer, clients, portProbe };
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

	it("starts Live Coding hidden, attended, and only in a windowless editor that asks for it (A1072)", () =>
	{
		const { launcher } = createLauncher();
		const request = { projectFile: MAC_PROJECT, port: 8000, startMcpServer: true };

		const liveCodingArguments = launcher.commandArguments({ ...request, windowless: true, startLiveCoding: true });

		expect(liveCodingArguments).toContain("-ini:EditorPerProjectUserSettings:[/Script/LiveCoding.LiveCodingSettings]:bEnabled=True,[/Script/LiveCoding.LiveCodingSettings]:Startup=AutomaticButHidden");
		expect(liveCodingArguments).not.toContain("-Unattended");
		expect(liveCodingArguments).not.toContain("-LiveCoding");
		expect(launcher.commandArguments({ ...request, windowless: true })).toContain("-Unattended");
		expect(launcher.commandArguments({ ...request, windowless: true }).join(" ")).not.toContain("LiveCodingSettings");
		expect(launcher.commandArguments({ ...request, windowless: false, startLiveCoding: true }).join(" ")).not.toContain("LiveCodingSettings");
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

	it("runs two launches at once one after the other, so the first editor is closed and not left running (A1075)", async () =>
	{
		const { launcher, processes } = createLauncher();
		const request = { engineRoot: MAC_ENGINE, projectFile: MAC_PROJECT, port: 8000, startMcpServer: true, windowless: true };

		const [first, second] = await Promise.all([launcher.launch(request), launcher.launch({ ...request, port: 8001 })]);

		expect(processes.specs).toHaveLength(2);
		expect(processes.exitRequestCount).toBe(1);
		expect(first.isRunning()).toBe(false);
		expect(second.isRunning()).toBe(true);
		expect(launcher.current()).toBe(second);
	});

	it("waits for the Live Coding ready line after the server answers, up to a minute, only when the launch asked for it (A1072)", async () =>
	{
		const processes = new FakeProcessLauncher([{ hangs: true }, { hangs: true, lines: ["LogLiveCodingServer: Display: Live coding ready - Save changes and press Ctrl+Alt+F11 to re-compile code"] }, { hangs: true }]);
		const timer = new FakeTimer();
		const launcher = new EditorLauncher({ paths: new WindowsPlatformPaths({}), launcher: processes, timer, portProbe: { isInUse: async () => false }, createClient: () => new FakeEditorToolClient() });
		const request = { engineRoot: "C:\\Epic\\UE_5.8", projectFile: "C:\\Dojo\\DojoSandbox\\Dojo.uproject", port: 8000, startMcpServer: true, windowless: true };

		// Asked for Live Coding, never says ready: waits the full minute, then still reports the editor as answering.
		const silent = await launcher.launch({ ...request, startLiveCoding: true });
		let silentAnswer: boolean | null = null;
		void launcher.waitUntilAnswering(silent, 180_000).then((value) => (silentAnswer = value));
		await settle();

		expect(silentAnswer).toBeNull();

		for (let second = 0; second < 61; second++)
		{
			timer.advance(1_000);
			await settle();
		}

		expect(silentAnswer).toBe(true);
		expect(silent.isLiveCodingReady()).toBe(false);

		// Asked for Live Coding and says ready: no wait.
		const ready = await launcher.launch({ ...request, startLiveCoding: true });

		expect(ready.isLiveCodingReady()).toBe(true);
		expect(await launcher.waitUntilAnswering(ready, 180_000)).toBe(true);

		// Did not ask: no wait, and never ready.
		const plain = await launcher.launch(request);

		expect(plain.startsLiveCoding).toBe(false);
		expect(await launcher.waitUntilAnswering(plain, 180_000)).toBe(true);
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

	it("refuses to start an editor when the MCP port is already taken (fix round 1)", async () =>
	{
		const { launcher, processes, portProbe } = createLauncher();
		portProbe.inUse = true;

		const failure = await launcher.launch({ engineRoot: MAC_ENGINE, projectFile: MAC_PROJECT, port: 8000, startMcpServer: true, windowless: false }).catch((error: unknown) => error);

		expect(failure).toBeInstanceOf(AppErrorException);
		expect((failure as AppErrorException).appError).toMatchObject({ code: "editor-launch-failed", message: "Port 8000 is already in use, so the editor's MCP server cannot start there.", suggestedAction: "Close the other Unreal editor or program using it, or change the MCP port in Settings." });
		expect(processes.specs).toEqual([]);
		expect(launcher.current()).toBeNull();
	});

	it("does not probe the port for an engine without the MCP server", async () =>
	{
		const { launcher, portProbe } = createLauncher();
		portProbe.inUse = true;

		await expect(launcher.launch({ engineRoot: MAC_ENGINE, projectFile: MAC_PROJECT, port: 8000, startMcpServer: false, windowless: false })).resolves.toBeDefined();
	});

	it("asks the editor to quit and schedules the kill even when the client's close never finishes", async () =>
	{
		const { launcher, processes, timer, clients } = createLauncher();
		processes.honorsExitRequests = false;
		await launcher.launch({ engineRoot: MAC_ENGINE, projectFile: MAC_PROJECT, port: 8000, startMcpServer: true, windowless: true });

		let exitRequestsWhenClientClosed = -1;
		clients[0]!.close = () =>
		{
			exitRequestsWhenClientClosed = processes.exitRequestCount;

			return new Promise<void>(() => undefined);
		};

		const closing = launcher.close();
		await settle();
		timer.advance(CLOSE_GRACE_MS);
		await closing;

		expect(exitRequestsWhenClientClosed).toBe(1);
		expect(processes.killCount).toBe(1);
	});

	it("starts nothing after dispose, including a reopen and a launch that was already on its way", async () =>
	{
		const { launcher, processes, portProbe } = createLauncher();
		await launcher.launch({ engineRoot: MAC_ENGINE, projectFile: MAC_PROJECT, port: 8000, startMcpServer: true, windowless: false });

		// A background reopen begins, and quit starts while it waits on the port check.
		let releaseProbe: (inUse: boolean) => void = () => undefined;
		portProbe.isInUse = () => new Promise<boolean>((resolve) => (releaseProbe = resolve));
		const reopening = launcher.reopen().catch((error: unknown) => error);
		await settle();

		await launcher.dispose();
		releaseProbe(false);

		expect(await reopening).toBeInstanceOf(AppErrorException);
		expect(await launcher.reopen()).toBeNull();
		await expect(launcher.launch({ engineRoot: MAC_ENGINE, projectFile: MAC_PROJECT, port: 8000, startMcpServer: true, windowless: false })).rejects.toBeInstanceOf(AppErrorException);
		expect(processes.specs).toHaveLength(1);
		expect(launcher.current()).toBeNull();
	});
});

describe("NodePortProbe", () =>
{
	it("sees the fake MCP server holding its port, and a closed port as free", async () =>
	{
		const server = new FakeUnrealMcpServer(() => ({ text: "{}" }));
		const port = await server.start();
		const probe = new NodePortProbe();

		expect(await probe.isInUse(port)).toBe(true);

		await server.stop();
		expect(await probe.isInUse(port)).toBe(false);
	});

	it("makes a real launcher refuse the port the fake server holds", async () =>
	{
		const server = new FakeUnrealMcpServer(() => ({ text: "{}" }));
		const port = await server.start();
		const processes = new FakeProcessLauncher([{ hangs: true }]);
		const launcher = new EditorLauncher({ paths: new MacPlatformPaths("/Users/learner"), launcher: processes, timer: new FakeTimer(), portProbe: new NodePortProbe(), createClient: () => new FakeEditorToolClient() });

		try
		{
			await expect(launcher.launch({ engineRoot: MAC_ENGINE, projectFile: MAC_PROJECT, port, startMcpServer: true, windowless: true })).rejects.toThrow(`Port ${port} is already in use`);
			expect(processes.specs).toEqual([]);
		}
		finally
		{
			await server.stop();
		}
	});
});
