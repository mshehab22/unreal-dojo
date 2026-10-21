// Checks sandbox creation: template copy, EngineAssociation, plugins per engine, the first build, settings, and the Windows path warning.
import { describe, expect, it } from "vitest";

import type { EngineInstall } from "@shared/types/engine";
import type { ProgressUpdate } from "../../src/main/services/unreal/ProgressUpdate";

import { AppErrorException } from "../../src/main/errors/AppErrorException";
import { MacPlatformPaths } from "../../src/main/services/unreal/MacPlatformPaths";
import type { PlatformPaths } from "../../src/main/services/unreal/PlatformPaths";
import { SandboxProjectService } from "../../src/main/services/unreal/SandboxProjectService";
import { UnrealBuilder } from "../../src/main/services/unreal/UnrealBuilder";
import { WindowsPlatformPaths } from "../../src/main/services/unreal/WindowsPlatformPaths";
import { FakeProcessLauncher, type ScriptedProcess } from "./FakeProcessLauncher";
import { FakeSandboxFileSystem } from "./FakeSandboxFileSystem";
import { FakeTimer } from "./FakeTimer";

/** The template's project file as shipped (A41). */
const TEMPLATE_PROJECT = JSON.stringify({ FileVersion: 3, EngineAssociation: "", Modules: [{ Name: "Dojo" }], Plugins: [{ Name: "ModelContextProtocol", Enabled: true }, { Name: "AutomationTestToolset", Enabled: true }, { Name: "LiveCodingToolset", Enabled: true }, { Name: "SomethingElse", Enabled: true }] });

/** A small template, with a stray build folder that must not be copied. */
const TEMPLATE_FILES = {
	"/App/resources/sandbox-template/Dojo.uproject": TEMPLATE_PROJECT,
	"/App/resources/sandbox-template/Source/Dojo/Dojo.Build.cs": "build rules",
	"/App/resources/sandbox-template/Intermediate/stale.bin": "stale",
};

/** Builds the service over fakes; the engine reports `version`. */
function createService(version: string, build: ScriptedProcess = { exitCode: 0, lines: ["@progress 'Compiling C++ source code...' 100%", "Result: Succeeded"] }, files: Record<string, string> = TEMPLATE_FILES, paths: PlatformPaths = new MacPlatformPaths("/Users/learner"))
{
	const fileSystem = new FakeSandboxFileSystem(files);
	const launcher = new FakeProcessLauncher([build]);
	const timer = new FakeTimer();
	const savedPaths: string[] = [];
	const engine: EngineInstall = { path: "/Engines/UE", version, source: "launcher", supportsFastLoop: version.startsWith("5.8") };

	const service = new SandboxProjectService({
		paths,
		fileSystem,
		builder: new UnrealBuilder(paths, launcher, timer),
		engineInspector: { inspectFolder: async () => engine },
		pathStore: { setSandboxPath: (sandboxPath) => savedPaths.push(sandboxPath) },
		timer,
		templateFolder: "/App/resources/sandbox-template",
	});

	return { service, fileSystem, launcher, savedPaths };
}

/** Reads the written project file. */
function projectOf(fileSystem: FakeSandboxFileSystem): { EngineAssociation: string; Plugins: { Name: string }[] }
{
	return JSON.parse(fileSystem.files.get("/Picked/DojoSandbox/Dojo.uproject") ?? "{}");
}

describe("SandboxProjectService", () =>
{
	it("copies the template into <picked>/DojoSandbox without build products, sets EngineAssociation, keeps the 5.8 plugins, builds, and remembers the path", async () =>
	{
		const { service, fileSystem, launcher, savedPaths } = createService("5.8.3");
		const updates: ProgressUpdate[] = [];

		const result = await service.create("/Engines/UE", "/Picked", (update) => updates.push(update), new AbortController().signal);

		expect(result).toEqual({ ok: true, sandboxPath: "/Picked/DojoSandbox", durationMs: 0, compilerOutput: "" });
		expect(fileSystem.files.get("/Picked/DojoSandbox/Source/Dojo/Dojo.Build.cs")).toBe("build rules");
		expect(fileSystem.files.has("/Picked/DojoSandbox/Intermediate/stale.bin")).toBe(false);
		expect(projectOf(fileSystem).EngineAssociation).toBe("5.8");
		expect(projectOf(fileSystem).Plugins.map((plugin) => plugin.Name)).toEqual(["ModelContextProtocol", "AutomationTestToolset", "LiveCodingToolset", "SomethingElse"]);
		expect(launcher.specs[0]?.commandArguments).toContain("-Project=/Picked/DojoSandbox/Dojo.uproject");
		expect(savedPaths).toEqual(["/Picked/DojoSandbox"]);
		expect(updates.map((update) => update.phase)).toEqual(["preparing", "writing", "building", "building", "building"]);
		expect(updates[3]).toEqual({ phase: "building", lastLine: "@progress 'Compiling C++ source code...' 100%", percent: 100 });
	});

	it("creates the sandbox under the picked folder's real path when it goes through a symbolic link", async () =>
	{
		const { service, fileSystem, launcher, savedPaths } = createService("5.8.3");
		fileSystem.links.set("/var/folders/x", "/private/var/folders/x");

		const result = await service.create("/Engines/UE", "/var/folders/x", () => undefined, new AbortController().signal);

		expect(result.sandboxPath).toBe("/private/var/folders/x/DojoSandbox");
		expect(savedPaths).toEqual(["/private/var/folders/x/DojoSandbox"]);
		expect(launcher.specs[0]?.commandArguments).toContain("-Project=/private/var/folders/x/DojoSandbox/Dojo.uproject");
	});

	it("drops the three 5.8 plugins for an older engine", async () =>
	{
		const { service, fileSystem } = createService("5.6.1");

		await service.create("/Engines/UE", "/Picked", () => undefined, new AbortController().signal);

		expect(projectOf(fileSystem).EngineAssociation).toBe("5.6");
		expect(projectOf(fileSystem).Plugins.map((plugin) => plugin.Name)).toEqual(["SomethingElse"]);
	});

	it("resolves ok false with the filtered compiler output when the first build fails, and still remembers the path", async () =>
	{
		const { service, savedPaths } = createService("5.8.3", { exitCode: 6, lines: ["Dojo/Support/DojoTestWorld.cpp:10:1: error: no member named 'SetBegunPlay'", "Result: Failed"] });

		const result = await service.create("/Engines/UE", "/Picked", () => undefined, new AbortController().signal);

		expect(result.ok).toBe(false);
		expect(result.compilerOutput).toContain("no member named 'SetBegunPlay'");
		expect(savedPaths).toEqual(["/Picked/DojoSandbox"]);
	});

	it("refuses a sandbox folder that already has files", async () =>
	{
		const { service } = createService("5.8.3", undefined, { ...TEMPLATE_FILES, "/Picked/DojoSandbox/keep.txt": "mine" });

		await expect(service.create("/Engines/UE", "/Picked", () => undefined, new AbortController().signal)).rejects.toMatchObject({ appError: { code: "sandbox-copy-failed" } });
	});

	it("throws run-cancelled when the build is cancelled", async () =>
	{
		const { service } = createService("5.8.3", { hangs: true });
		const controller = new AbortController();

		const pending = service.create("/Engines/UE", "/Picked", (update) =>
		{
			if (update.phase === "building") controller.abort();
		}, controller.signal);

		await expect(pending).rejects.toBeInstanceOf(AppErrorException);
		await expect(pending).rejects.toMatchObject({ appError: { code: "run-cancelled" } });
	});

	it("rebuilds by removing build products first, and refuses a folder with no project", async () =>
	{
		const { service, fileSystem } = createService("5.8.3", undefined, { "/S/Dojo.uproject": "{}", "/S/Binaries/Mac/lib.dylib": "x" });

		const result = await service.rebuild("/Engines/UE", "/S", () => undefined, new AbortController().signal);

		expect(result.ok).toBe(true);
		expect(fileSystem.removedFolders).toEqual(["/S/Binaries", "/S/Intermediate", "/S/Saved", "/S/DerivedDataCache"]);
		await expect(service.rebuild("/Engines/UE", "/Empty", () => undefined, new AbortController().signal)).rejects.toMatchObject({ appError: { code: "sandbox-not-ready" } });
	});

	it("sends the long-path warning as a preparing line when creating on Windows", async () =>
	{
		const longFolder = `C:\\Users\\learner\\${"Very Long Folder Name\\".repeat(4)}`;
		const { service } = createService("5.8.3", undefined, TEMPLATE_FILES, new WindowsPlatformPaths({}));
		const updates: ProgressUpdate[] = [];

		// The in-memory file system only knows forward slashes, so the copy fails later; the warning is sent before it.
		await service.create("/Engines/UE", longFolder, (update) => updates.push(update), new AbortController().signal).catch(() => undefined);

		expect(updates[1]).toMatchObject({ phase: "preparing", lastLine: expect.stringMatching(/characters long/) });
	});

	it("warns about a long sandbox path on Windows only", () =>
	{
		const longFolder = `C:\\Users\\learner\\${"Very Long Folder Name\\".repeat(4)}`;
		const { service: windowsService } = createService("5.8.3", undefined, TEMPLATE_FILES, new WindowsPlatformPaths({}));
		const { service: macService } = createService("5.8.3");

		expect(windowsService.folderWarnings("C:\\Dojo")).toEqual([]);
		expect(windowsService.folderWarnings(longFolder)[0]).toMatch(/characters long/);
		expect(macService.folderWarnings(`/Users/learner/${"Very Long Folder Name/".repeat(4)}`)).toEqual([]);
	});
});
