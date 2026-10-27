// Checks the openEditor service: setup required, reuse of a fresh editor, restart of a stale one, windowless when the window cannot open, and a server that never answers.
import { describe, expect, it } from "vitest";

import type { EngineInstall, ToolchainCheck } from "@shared/types/engine";

import { EditorLauncher } from "../../src/main/services/unreal/EditorLauncher";
import { EDITOR_READY_TIMEOUT_MS, EditorService } from "../../src/main/services/unreal/EditorService";
import { FullBuildLedger } from "../../src/main/services/unreal/FullBuildLedger";
import { MacPlatformPaths } from "../../src/main/services/unreal/MacPlatformPaths";
import type { PlatformPaths } from "../../src/main/services/unreal/PlatformPaths";
import { WindowsPlatformPaths } from "../../src/main/services/unreal/WindowsPlatformPaths";
import { FakeEditorToolClient } from "./FakeEditorToolClient";
import { FakeProcessLauncher } from "./FakeProcessLauncher";
import { FakeTimer } from "./FakeTimer";
import { MemoryUnrealSettings } from "./MemoryUnrealSettings";

const ENGINE = "/Users/learner/Applications/UE_5.8";
const SANDBOX = "/Users/learner/Dojo/DojoSandbox";
const HEALTHY: ToolchainCheck = { ok: true, tool: "xcode-select", message: "Xcode 27.1 is selected.", problems: [] };
const METAL_MISSING: ToolchainCheck = { ...HEALTHY, problems: [{ blocksBuild: false, error: { code: "toolchain-missing", message: "The Metal toolchain is not installed.", suggestedAction: "xcodebuild -downloadComponent MetalToolchain" } }] };

/** The service over fakes; `version` picks 5.8 (fast loop) or 5.6. */
function createRig(options: { version?: "5.8.3" | "5.6.1"; toolchain?: ToolchainCheck; enginePath?: string | null; answering?: boolean; alwaysWindowless?: boolean; startLiveCodingWhenWindowless?: boolean; paths?: PlatformPaths } = {})
{
	const paths = options.paths ?? new MacPlatformPaths("/Users/learner");
	const timer = new FakeTimer();
	// The ready line only counts when the launch asked for Live Coding (A1072).
	const readyEditor = { hangs: true, lines: ["LogLiveCodingServer: Display: Live coding ready - Save changes and press Ctrl+Alt+F11 to re-compile code"] };
	const processes = new FakeProcessLauncher([readyEditor, readyEditor, readyEditor]);
	const clients: FakeEditorToolClient[] = [];
	const editorLauncher = new EditorLauncher({ paths, launcher: processes, timer, portProbe: { isInUse: async () => false }, createClient: () =>
	{
		const client = new FakeEditorToolClient();
		client.answering = options.answering ?? true;
		clients.push(client);

		return client;
	} });
	const settings = new MemoryUnrealSettings(options.enginePath === undefined ? ENGINE : options.enginePath, SANDBOX);
	settings.mcpPort = 8123;
	const ledger = new FullBuildLedger();
	const version = options.version ?? "5.8.3";
	const engine: EngineInstall = { path: ENGINE, version, source: "launcher", supportsFastLoop: version === "5.8.3" };
	const service = new EditorService({ settings, engineInspector: { inspectFolder: async () => engine }, editorLauncher, ledger, paths, checkToolchain: async () => options.toolchain ?? HEALTHY, alwaysWindowless: options.alwaysWindowless, startLiveCodingWhenWindowless: options.startLiveCodingWhenWindowless });

	return { service, processes, clients, ledger, timer, editorLauncher, settings };
}

describe("EditorService", () =>
{
	it("opens the editor with the MCP server on the port from settings and waits for it to answer", async () =>
	{
		const { service, processes } = createRig();

		await service.openEditor();

		expect(processes.specs[0]?.commandArguments).toEqual([`${SANDBOX}/Dojo.uproject`, "-ModelContextProtocolStartServer", "-ModelContextProtocolPort=8123"]);
		expect(await service.isConnected()).toBe(true);
	});

	it("opens a windowless editor when the toolchain says the window cannot open (missing Metal toolchain)", async () =>
	{
		const { service, processes } = createRig({ toolchain: METAL_MISSING });

		await service.openEditor();

		expect(processes.specs[0]?.commandArguments).toContain("-NullRHI");
	});

	it("always opens a windowless editor when tests ask for it, even with a healthy toolchain and an older engine (A643, A1074)", async () =>
	{
		const fast = createRig({ alwaysWindowless: true });
		await fast.service.openEditor();

		expect(fast.processes.specs[0]?.commandArguments).toContain("-NullRHI");

		const older = createRig({ alwaysWindowless: true, version: "5.6.1" });
		await older.service.openEditor();

		expect(older.processes.specs[0]?.commandArguments).toEqual([`${SANDBOX}/Dojo.uproject`, "-NullRHI", "-Unattended", "-NoSplash", "-NoSound", "-stdout", "-FullStdOutLogOutput"]);
	});

	it("starts Live Coding in a windowless Windows editor only when asked, and never on the Mac or in a windowed editor (A1072)", async () =>
	{
		const windows = new WindowsPlatformPaths({});
		const unasked = createRig({ alwaysWindowless: true, paths: windows });
		await unasked.service.openEditor();

		expect(unasked.processes.specs[0]?.commandArguments).toContain("-Unattended");
		expect(unasked.processes.specs[0]?.commandArguments.join(" ")).not.toContain("LiveCodingSettings");

		const windowlessOnWindows = createRig({ alwaysWindowless: true, startLiveCodingWhenWindowless: true, paths: windows });
		await windowlessOnWindows.service.openEditor();

		expect(windowlessOnWindows.processes.specs[0]?.commandArguments.join(" ")).toContain("LiveCodingSettings]:Startup=AutomaticButHidden");

		const windowedOnWindows = createRig({ startLiveCodingWhenWindowless: true, paths: windows });
		await windowedOnWindows.service.openEditor();

		expect(windowedOnWindows.processes.specs[0]?.commandArguments.join(" ")).not.toContain("LiveCodingSettings");

		const windowlessOnMac = createRig({ alwaysWindowless: true, startLiveCodingWhenWindowless: true });
		await windowlessOnMac.service.openEditor();

		expect(windowlessOnMac.processes.specs[0]?.commandArguments.join(" ")).not.toContain("LiveCodingSettings");
	});

	it("opens an engine older than 5.8 without the MCP server and does not wait", async () =>
	{
		const { service, processes } = createRig({ version: "5.6.1" });

		await service.openEditor();

		expect(processes.specs[0]?.commandArguments).toEqual([`${SANDBOX}/Dojo.uproject`]);
	});

	it("keeps a fresh, answering editor instead of opening another", async () =>
	{
		const { service, processes } = createRig();

		await service.openEditor();
		await service.openEditor();

		expect(processes.specs).toHaveLength(1);
	});

	it("restarts a stale editor (a full build finished after it opened)", async () =>
	{
		const { service, processes, ledger, timer } = createRig();
		await service.openEditor();
		timer.advance(10);
		ledger.recordSandboxBuild(timer.now());

		await service.openEditor();

		expect(processes.specs).toHaveLength(2);
		expect(processes.exitRequestCount).toBe(1);
	});

	it("restarts the editor on the new engine when the engine in Settings changed while it was open (M1.4c)", async () =>
	{
		const { service, processes, settings, editorLauncher } = createRig();
		await service.openEditor();

		settings.enginePath = "/Users/Shared/Epic Games/UE_5.8";
		await service.openEditor();

		expect(processes.specs).toHaveLength(2);
		expect(processes.specs[1]?.command).toBe("/Users/Shared/Epic Games/UE_5.8/Engine/Binaries/Mac/UnrealEditor.app/Contents/MacOS/UnrealEditor");
		expect(editorLauncher.current()?.engineRoot).toBe("/Users/Shared/Epic Games/UE_5.8");
	});

	it("refuses before setup", async () =>
	{
		await expect(createRig({ enginePath: null }).service.openEditor()).rejects.toMatchObject({ appError: { code: "sandbox-not-ready" } });
	});

	it("closes the editor and explains when its server never answers", async () =>
	{
		const { service, processes, timer } = createRig({ answering: false });
		const opening = service.openEditor().catch((error: unknown) => error);

		for (let second = 0; second <= EDITOR_READY_TIMEOUT_MS / 1000; second++)
		{
			for (let step = 0; step < 5; step++) await Promise.resolve();
			timer.advance(1000);
		}

		expect(await opening).toMatchObject({ appError: { code: "editor-launch-failed" } });
		expect(processes.exitRequestCount).toBe(1);
		expect(await service.isConnected()).toBe(false);
	});
});
