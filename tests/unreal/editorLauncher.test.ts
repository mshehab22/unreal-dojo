// Checks the editor's command line on both platforms, one editor at a time, waiting for the server, and the two-step close.
import { describe, expect, it } from "vitest";

import { AppErrorException } from "../../src/main/errors/AppErrorException";
import { CLOSE_GRACE_MS, EditorLauncher } from "../../src/main/services/unreal/EditorLauncher";
import { NodePortProbe } from "../../src/main/services/unreal/NodePortProbe";
import { stopEditorBeforeQuit, type QuittingApp } from "../../src/main/services/unreal/stopEditorBeforeQuit";
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

describe("stopEditorBeforeQuit", () =>
{
	/** A stand-in for Electron's app that records quits and replays before-quit. */
	function createApp()
	{
		let listener: (event: { preventDefault(): void }) => void = () => undefined;
		const app = { quitCount: 0, on: (_eventName: "before-quit", newListener: typeof listener) => (listener = newListener), quit: () => app.quitCount++ };
		const fire = (): boolean =>
		{
			let prevented = false;
			listener({ preventDefault: () => (prevented = true) });

			return prevented;
		};

		return { app: app as QuittingApp & { quitCount: number }, fire };
	}

	it("holds the quit until the open editor is closed, holds any quit attempt meanwhile, then quits", async () =>
	{
		const { launcher, processes, timer } = createLauncher();
		processes.honorsExitRequests = false;
		await launcher.launch({ engineRoot: MAC_ENGINE, projectFile: MAC_PROJECT, port: 8000, startMcpServer: true, windowless: false });
		const { app, fire } = createApp();
		stopEditorBeforeQuit(app, launcher);

		expect(fire()).toBe(true);
		await settle();
		expect(fire()).toBe(true);
		expect(app.quitCount).toBe(0);

		timer.advance(CLOSE_GRACE_MS);
		for (let step = 0; step < 4; step++) await settle();

		expect(processes.killCount).toBe(1);
		expect(app.quitCount).toBe(1);
		expect(fire()).toBe(false);
	});

	it("lets the quit through when no editor is open, and still stops any later reopen", async () =>
	{
		const { launcher } = createLauncher();
		const { app, fire } = createApp();
		stopEditorBeforeQuit(app, launcher);

		expect(fire()).toBe(false);
		await settle();
		expect(await launcher.reopen()).toBeNull();
	});
});
