// Checks the friendly-failure parts of the environment status: the engine problem, the session-cached toolchain, and the one-time save notice.
import { describe, expect, it } from "vitest";

import type { ToolchainCheck } from "@shared/types/engine";
import type { AppError } from "@shared/types/errors";

import { AppErrorException } from "../../src/main/errors/AppErrorException";
import { EnvironmentStatusReader, type EnvironmentSources } from "../../src/main/services/settings/EnvironmentStatusReader";
import { SettingsService } from "../../src/main/services/settings/SettingsService";
import { FakeSecretEncryptor, FakeSettingsChecks, MemorySettingsStore } from "./settingsFakes";

const ENGINE_PATH = "/Engines/UE_5.8";

const HEALTHY_TOOLCHAIN: ToolchainCheck = { ok: true, tool: "vswhere", message: "Visual Studio 2022 is ready.", problems: [] };

const BROKEN_TOOLCHAIN: ToolchainCheck = {
	ok: false,
	tool: "vswhere",
	message: "Visual Studio is missing the C++ workload.",
	problems: [
		{
			blocksBuild: true,
			error: { code: "toolchain-missing", message: "Visual Studio has no C++ game tools.", suggestedAction: "Add the Game development with C++ workload." },
		},
	],
	suggestedAction: "Add the Game development with C++ workload.",
};

/** A refused save, as the progress service reports it for a file from a newer app. */
const REFUSED_SAVE: AppError = {
	code: "save-failed",
	message: "This progress file was made by a newer version of Unreal Dojo.",
	suggestedAction: "Update the app to keep your progress.",
};

/** Sources for a learner with a set engine; a test overrides what it checks. The toolchain check counts its calls. */
function createSources(overrides: Partial<EnvironmentSources> = {}): { sources: EnvironmentSources; toolchainCalls: () => number }
{
	const service = new SettingsService(new MemorySettingsStore({ enginePath: ENGINE_PATH }), new FakeSecretEncryptor(), new FakeSettingsChecks());
	let toolchainCalls = 0;

	const sources: EnvironmentSources = {
		currentSettings: () => service.current(),
		inspectEngine: async (folder) => ({ path: folder, version: "5.8.3", source: "manual", supportsFastLoop: true }),
		pathExists: async () => false,
		reviewStatuses: async () => [],
		editorConnected: async () => false,
		checkToolchain: async () =>
		{
			toolchainCalls++;
			return HEALTHY_TOOLCHAIN;
		},
		saveRefusal: () => null,
		saveLoadRecovery: () => ({ kind: "none" }),
		...overrides,
	};

	return { sources, toolchainCalls: () => toolchainCalls };
}

describe("EnvironmentStatusReader engine problem", () =>
{
	it("names the folder when the engine that was set is gone", async () =>
	{
		const { sources } = createSources({
			inspectEngine: async () =>
			{
				throw new AppErrorException("engine-not-found", "That folder does not look like an Unreal Engine install.", "Pick it again.", "No Build.version");
			},
		});

		const status = await new EnvironmentStatusReader(sources).read();

		expect(status.engine).toBeNull();
		expect(status.engineProblem?.code).toBe("engine-not-found");
		expect(status.engineProblem?.message).toContain(ENGINE_PATH);
		expect(status.engineProblem?.suggestedAction).toContain("Settings");
	});

	it("keeps the too-old engine's own error", async () =>
	{
		const tooOld = new AppErrorException("engine-version-unsupported", "Unreal Engine 5.3 is too old.", "Install 5.8.", ENGINE_PATH);
		const { sources } = createSources({ inspectEngine: async () => { throw tooOld; } });

		const status = await new EnvironmentStatusReader(sources).read();

		expect(status.engineProblem).toEqual(tooOld.appError);
	});

	it("has no problem when an engine is found, and none when no engine is set", async () =>
	{
		const found = await new EnvironmentStatusReader(createSources().sources).read();
		const service = new SettingsService(new MemorySettingsStore(), new FakeSecretEncryptor(), new FakeSettingsChecks());
		const unset = await new EnvironmentStatusReader(createSources({ currentSettings: () => service.current() }).sources).read();

		expect(found.engineProblem).toBeNull();
		expect(unset.engine).toBeNull();
		expect(unset.engineProblem).toBeNull();
	});
});

describe("EnvironmentStatusReader toolchain", () =>
{
	it("lists the toolchain problem", async () =>
	{
		const { sources } = createSources({ checkToolchain: async () => BROKEN_TOOLCHAIN });

		const status = await new EnvironmentStatusReader(sources).read();

		expect(status.toolchain?.ok).toBe(false);
		expect(status.toolchain?.problems[0]?.error.code).toBe("toolchain-missing");
	});

	it("runs the check once across several reads, even when they overlap", async () =>
	{
		const { sources, toolchainCalls } = createSources();
		const reader = new EnvironmentStatusReader(sources);

		await Promise.all([reader.read(), reader.read()]);
		await reader.read();
		await reader.read();

		expect(toolchainCalls()).toBe(1);
	});

	it("checks again on request and keeps the newer answer for later reads", async () =>
	{
		let current = BROKEN_TOOLCHAIN;
		let calls = 0;
		const { sources } = createSources({
			checkToolchain: async () =>
			{
				calls++;
				return current;
			},
		});
		const reader = new EnvironmentStatusReader(sources);

		expect((await reader.read()).toolchain?.ok).toBe(false);

		current = HEALTHY_TOOLCHAIN;
		const refreshed = await reader.refreshToolchain();

		expect(refreshed.ok).toBe(true);
		expect((await reader.read()).toolchain?.ok).toBe(true);
		expect(calls).toBe(2);
	});

	it("reports no toolchain when the check cannot run, without failing the read", async () =>
	{
		const { sources } = createSources({ checkToolchain: async () => { throw new Error("vswhere crashed"); } });

		const status = await new EnvironmentStatusReader(sources).read();

		expect(status.toolchain).toBeNull();
		expect(status.engine).not.toBeNull();
	});
});

describe("EnvironmentStatusReader save notice", () =>
{
	it("has no notice when the save loaded cleanly", async () =>
	{
		const status = await new EnvironmentStatusReader(createSources().sources).read();

		expect(status.saveNotice).toBeNull();
	});

	it("tells about a restore from the backup once, then stays quiet", async () =>
	{
		const { sources } = createSources({ saveLoadRecovery: () => ({ kind: "backup", quarantinedPath: "/data/progress.json.bad" }) });
		const reader = new EnvironmentStatusReader(sources);

		const first = await reader.read();
		const second = await reader.read();

		expect(first.saveNotice?.code).toBe("save-failed");
		expect(first.saveNotice?.message).toContain("backup");
		expect(first.saveNotice?.detail).toContain("/data/progress.json.bad");
		expect(second.saveNotice).toBeNull();
	});

	it("tells about a fresh start when the file and its backup were both bad", async () =>
	{
		const { sources } = createSources({ saveLoadRecovery: () => ({ kind: "fresh" }) });

		const status = await new EnvironmentStatusReader(sources).read();

		expect(status.saveNotice?.message).toContain("new save");
	});

	it("shows a refused save, which wins over a recovery", async () =>
	{
		const { sources } = createSources({ saveRefusal: () => REFUSED_SAVE, saveLoadRecovery: () => ({ kind: "backup" }) });
		const reader = new EnvironmentStatusReader(sources);

		expect((await reader.read()).saveNotice).toEqual(REFUSED_SAVE);
		expect((await reader.read()).saveNotice).toBeNull();
	});
});
