// Checks the settings service (round trip, defaults, the API key through a fake safeStorage) and the environment status reader.
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { ReviewProviderStatus } from "@shared/types/review";

import { AppErrorException } from "../../src/main/errors/AppErrorException";
import { SafeStorageReviewSettings } from "../../src/main/services/review/settings/SafeStorageReviewSettings";
import { EnvironmentStatusReader, resolveReviewProvider, type EnvironmentSources } from "../../src/main/services/settings/EnvironmentStatusReader";
import { SettingsService } from "../../src/main/services/settings/SettingsService";
import { DEFAULT_SETTINGS } from "../../src/main/services/settings/storedSettings";
import { invalidConfigPath, openSettingsStore } from "../../src/main/services/settings/openSettingsStore";
import type { SettingsStore } from "../../src/main/services/settings/SettingsStore";
import { FakeSecretEncryptor, FakeSettingsChecks, MemorySettingsStore } from "./settingsFakes";

/** A key shaped like an Anthropic key; only ever used against the fake. */
const TEST_API_KEY = "sk-ant-test-0123456789abcdef";

/** A fixed clock for first-run timestamps. */
const FIXED_NOW = new Date("2026-10-21T09:30:00.000Z");

/** Builds a service over a memory store, with the fake encryptor, the fake folder checks, and the fixed clock. */
function createService(initialValues: Record<string, unknown> = {}): { service: SettingsService; store: MemorySettingsStore; encryptor: FakeSecretEncryptor; checks: FakeSettingsChecks }
{
	const store = new MemorySettingsStore(initialValues);
	const encryptor = new FakeSecretEncryptor();
	const checks = new FakeSettingsChecks();

	return { service: new SettingsService(store, encryptor, checks, () => FIXED_NOW), store, encryptor, checks };
}

/** Opens a second service on the same store, as a restart would. */
function reopen(store: SettingsStore, now: () => Date = () => FIXED_NOW): SettingsService
{
	return new SettingsService(store, new FakeSecretEncryptor(), new FakeSettingsChecks(), now);
}

/** Catches what a promise rejects with. */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown>
{
	return promise.then(() => undefined, (thrown: unknown) => thrown);
}

/** Catches what a call throws, for asserting on an AppErrorException. */
function thrownBy(call: () => unknown): unknown
{
	try
	{
		call();
	}
	catch (thrown)
	{
		return thrown;
	}

	return undefined;
}

describe("SettingsService", () =>
{
	it("starts from the defaults on a fresh install", () =>
	{
		const { service } = createService();

		expect(service.current()).toEqual({ ...DEFAULT_SETTINGS, hasApiKey: false });
		expect(service.current()).toMatchObject({ loopMode: "auto", reviewProvider: "auto", modelId: "claude-sonnet-5-5", theme: "dark", mcpPort: 8000 });
	});

	it("round-trips every setting through the store into a new service", async () =>
	{
		const { service, store } = createService();

		service.setSandboxPath("/Sandboxes/DojoSandbox");
		const updated = await service.update({ enginePath: "/Engines/UE_5.8", loopMode: "headless", reviewProvider: "tests-only", modelId: "claude-opus-5-5", mcpPort: 8123 });
		const reopened = reopen(store);

		expect(reopened.current()).toEqual(updated);
		expect(reopened.current()).toMatchObject({ enginePath: "/Engines/UE_5.8", loopMode: "headless", mcpPort: 8123 });
	});

	it("answers current() synchronously with each change at once, so closures see it without a restart", async () =>
	{
		const { service } = createService();
		const readModel = () => service.current().modelId;

		await service.update({ modelId: "claude-haiku-5-5" });

		expect(readModel()).toBe("claude-haiku-5-5");
	});

	it("leaves fields a patch does not name alone, and can set both paths back to null", async () =>
	{
		const { service } = createService({ sandboxPath: "/Sandboxes/DojoSandbox" });

		await service.update({ enginePath: "/Engines/UE_5.8", loopMode: "fast" });
		await service.update({ enginePath: null, sandboxPath: null });

		expect(service.current()).toMatchObject({ enginePath: null, sandboxPath: null, loopMode: "fast" });
	});

	it("stores an engine path only after the engine locator accepts it, as the root it found", async () =>
	{
		const { service, store } = createService();

		await service.update({ enginePath: "/Engines/UE_5.8/Engine" });

		expect(service.current().enginePath).toBe("/Engines/UE_5.8");
		expect(store.values.enginePath).toBe("/Engines/UE_5.8");
	});

	it("refuses an engine path that is not an engine with the locator's error, and writes nothing from that patch", async () =>
	{
		const { service, store } = createService({ enginePath: "/Engines/UE_5.8" });

		const refusal = await rejectionOf(service.update({ enginePath: "/tmp", loopMode: "headless" }));

		expect((refusal as AppErrorException).appError.code).toBe("engine-not-found");
		expect(service.current()).toMatchObject({ enginePath: "/Engines/UE_5.8", loopMode: "auto" });
		expect(store.values).toEqual({ enginePath: "/Engines/UE_5.8" });
	});

	it("falls back to the default for each stored value that is missing or invalid, keeping the valid ones", () =>
	{
		const { service } = createService({ loopMode: "turbo", mcpPort: 80, modelId: "", theme: "light", firstRunCompletedAt: "yesterday", reviewProvider: "claude-code", sandboxPath: "/Sandboxes/DojoSandbox" });

		expect(service.current()).toMatchObject({ loopMode: "auto", mcpPort: 8000, modelId: "claude-sonnet-5-5", theme: "dark", firstRunCompletedAt: null, reviewProvider: "claude-code", sandboxPath: "/Sandboxes/DojoSandbox" });
	});

	it("reads the sandboxPath the sandbox service wrote before this service existed (A186), and records new ones as the path store", () =>
	{
		const { service, store } = createService({ sandboxPath: "/Old/DojoSandbox" });

		expect(service.current().sandboxPath).toBe("/Old/DojoSandbox");

		service.setSandboxPath("/New/DojoSandbox");

		expect(store.values.sandboxPath).toBe("/New/DojoSandbox");
		expect(service.current().sandboxPath).toBe("/New/DojoSandbox");
	});
});

describe("SettingsService API key", () =>
{
	it("stores the key encrypted, reports only hasApiKey, and the review settings decrypt it back", async () =>
	{
		const { service, store, encryptor } = createService();

		service.setApiKey(TEST_API_KEY);

		expect(service.current().hasApiKey).toBe(true);
		expect(JSON.stringify(service.current())).not.toContain(TEST_API_KEY);
		expect(JSON.stringify(store.values)).not.toContain(TEST_API_KEY);

		const reviewSettings = new SafeStorageReviewSettings({ currentSettings: () => service.current(), loadEncryptedApiKey: () => service.loadEncryptedApiKey(), decryptor: encryptor });

		expect(reviewSettings.hasApiKey()).toBe(true);
		expect(await reviewSettings.readApiKey()).toBe(TEST_API_KEY);
	});

	it("keeps hasApiKey after a restart and clears the key for good", async () =>
	{
		const { service, store } = createService();

		service.setApiKey(TEST_API_KEY);
		expect(reopen(store).current().hasApiKey).toBe(true);

		service.clearApiKey();
		service.clearApiKey();

		expect(service.current().hasApiKey).toBe(false);
		expect(await service.loadEncryptedApiKey()).toBeNull();
		expect(reopen(store).current().hasApiKey).toBe(false);
	});

	it("refuses with a clear secure-storage-unavailable AppError when safeStorage cannot encrypt, and stores nothing", () =>
	{
		const { service, store, encryptor } = createService();
		encryptor.available = false;

		const thrown = thrownBy(() => service.setApiKey(TEST_API_KEY));

		expect(thrown).toBeInstanceOf(AppErrorException);
		expect((thrown as AppErrorException).appError).toMatchObject({ code: "secure-storage-unavailable", message: "Unreal Dojo cannot store your API key safely on this computer right now." });
		expect((thrown as AppErrorException).appError.suggestedAction).toMatch(/keychain/);
		expect(service.current().hasApiKey).toBe(false);
		expect(store.values).toEqual({});
	});

	it("turns an encryption failure into the same AppError without the key anywhere in it", () =>
	{
		const { service, encryptor } = createService();
		encryptor.failEncryption = true;

		const thrown = thrownBy(() => service.setApiKey(TEST_API_KEY)) as AppErrorException;

		expect(thrown.appError.code).toBe("secure-storage-unavailable");
		expect(JSON.stringify(thrown.appError)).not.toContain(TEST_API_KEY);
		expect(thrown.message).not.toContain(TEST_API_KEY);
	});
});

describe("SettingsService first run", () =>
{
	it("refuses to finish first run while the engine or sandbox is unset", async () =>
	{
		const { service } = createService({ enginePath: "/Engines/UE_5.8" });

		expect(((await rejectionOf(service.completeFirstRun())) as AppErrorException).appError.code).toBe("settings-invalid");
		expect(service.current().firstRunCompletedAt).toBeNull();
	});

	it("refuses with the locator's error when the stored engine folder is not an engine", async () =>
	{
		const { service } = createService({ enginePath: "/tmp", sandboxPath: "/Sandboxes/DojoSandbox" });

		expect(((await rejectionOf(service.completeFirstRun())) as AppErrorException).appError.code).toBe("engine-not-found");
		expect(service.current().firstRunCompletedAt).toBeNull();
	});

	it("refuses with sandbox-not-ready when the sandbox folder holds no Dojo.uproject", async () =>
	{
		const { service } = createService({ enginePath: "/Engines/UE_5.8", sandboxPath: "/definitely/not/a/sandbox" });

		const refusal = (await rejectionOf(service.completeFirstRun())) as AppErrorException;

		expect(refusal.appError).toMatchObject({ code: "sandbox-not-ready", detail: "no Dojo.uproject in /definitely/not/a/sandbox" });
		expect(service.current().firstRunCompletedAt).toBeNull();
	});

	it("stamps the finish time once and keeps the first one", async () =>
	{
		const { service, store } = createService({ enginePath: "/Engines/UE_5.8", sandboxPath: "/Sandboxes/DojoSandbox" });

		expect((await service.completeFirstRun()).firstRunCompletedAt).toBe(FIXED_NOW.toISOString());

		const later = reopen(store, () => new Date("2027-01-01T00:00:00.000Z"));
		expect((await later.completeFirstRun()).firstRunCompletedAt).toBe(FIXED_NOW.toISOString());
	});
});

/** A store whose open or first read throws like electron-store on a corrupt file, until the file is renamed. */
function corruptStoreOpening(failure: Error, options: { stillFailsAfterRename?: boolean; renameFails?: boolean } = {})
{
	const renames: [string, string][] = [];
	const warnings: string[] = [];
	let renamed = false;

	return {
		renames,
		warnings,
		opening: {
			open: (): SettingsStore =>
			{
				const broken = !renamed || options.stillFailsAfterRename === true;
				const store = new MemorySettingsStore({ loopMode: "headless" });

				return broken ? { ...store, readAll: () => { throw failure; }, write: () => { throw failure; }, remove: () => { throw failure; } } : store;
			},
			configPath: join("/", "Users", "learner", "Library", "Application Support", "Unreal Dojo", "config.json"),
			renameFile: (fromPath: string, toPath: string) =>
			{
				if (options.renameFails) throw new Error("EACCES: permission denied");

				renames.push([fromPath, toPath]);
				renamed = true;
			},
			now: () => FIXED_NOW,
			warn: (message: string) => void warnings.push(message),
		},
	};
}

/** The error JSON.parse throws on a truncated file, which electron-store passes on. */
function parseFailure(): Error
{
	try
	{
		JSON.parse("{\"loopMode\": ");
	}
	catch (error)
	{
		return error as Error;
	}

	return new SyntaxError("Unexpected end of JSON input");
}

describe("openSettingsStore", () =>
{
	it("names the set-aside file config.invalid-<time>.json next to the original", () =>
	{
		expect(invalidConfigPath(join("/", "data", "config.json"), FIXED_NOW)).toBe(join("/", "data", "config.invalid-2026-10-21T09-30-00-000Z.json"));
	});

	it("renames an unparseable config.json, opens a fresh one, and logs once", () =>
	{
		const { opening, renames, warnings } = corruptStoreOpening(parseFailure());

		const store = openSettingsStore(opening);

		expect(renames).toEqual([[opening.configPath, invalidConfigPath(opening.configPath, FIXED_NOW)]]);
		expect(store.readAll()).toEqual({ loopMode: "headless" });
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toMatch(/could not be parsed.*renamed to .*config\.invalid-/);
	});

	it("starts the settings service from the defaults on a store that throws on read, instead of stopping the app", () =>
	{
		const { opening } = corruptStoreOpening(parseFailure(), { stillFailsAfterRename: true });

		const service = new SettingsService(openSettingsStore(opening), new FakeSecretEncryptor(), new FakeSettingsChecks());

		expect(service.current()).toEqual({ ...DEFAULT_SETTINGS, hasApiKey: false });
	});

	it("falls back to memory when the corrupt file cannot be renamed, or the file fails for another reason", () =>
	{
		const renameFails = corruptStoreOpening(parseFailure(), { renameFails: true });
		expect(openSettingsStore(renameFails.opening).readAll()).toEqual({});
		expect(renameFails.warnings[0]).toMatch(/not saved this session/);

		const permissions = corruptStoreOpening(new Error("EACCES: permission denied, open config.json"));
		expect(openSettingsStore(permissions.opening).readAll()).toEqual({});
		expect(permissions.renames).toEqual([]);
		expect(permissions.warnings).toHaveLength(1);
	});

	it("opens a healthy file without renaming or logging", () =>
	{
		const warnings: string[] = [];
		const store = openSettingsStore({ open: () => new MemorySettingsStore({ mcpPort: 8123 }), configPath: "/data/config.json", renameFile: () => { throw new Error("must not rename"); }, now: () => FIXED_NOW, warn: (message) => void warnings.push(message) });

		expect(store.readAll()).toEqual({ mcpPort: 8123 });
		expect(warnings).toEqual([]);
	});
});

/** Review statuses with Claude Code signed out and the API key available. */
const STATUSES: ReviewProviderStatus[] = [
	{ id: "claude-code", available: false, reason: "Claude Code is not signed in." },
	{ id: "anthropic-api", available: true, version: "claude-sonnet-5-5" },
	{ id: "tests-only", available: true },
];

describe("resolveReviewProvider", () =>
{
	it("follows the auto order, honors an explicit pick, and answers null when only tests-only is left", () =>
	{
		expect(resolveReviewProvider("auto", STATUSES)?.id).toBe("anthropic-api");
		expect(resolveReviewProvider("anthropic-api", STATUSES)?.id).toBe("anthropic-api");
		expect(resolveReviewProvider("claude-code", STATUSES)).toBeNull();
		expect(resolveReviewProvider("tests-only", STATUSES)?.id).toBe("tests-only");
		expect(resolveReviewProvider("auto", [{ id: "tests-only", available: true }])).toBeNull();
	});
});

describe("EnvironmentStatusReader", () =>
{
	/** Sources for a learner with an engine and a built sandbox; each test overrides what it checks. */
	function sources(overrides: Partial<EnvironmentSources> = {}): EnvironmentSources
	{
		const { service } = createService({ enginePath: "/Engines/UE_5.8", sandboxPath: "/Sandboxes/DojoSandbox", loopMode: "headless" });
		const existing = new Set([join("/Sandboxes/DojoSandbox", "Dojo.uproject"), join("/Sandboxes/DojoSandbox", "Binaries")]);

		return {
			currentSettings: () => service.current(),
			inspectEngine: async (folder) => ({ path: folder, version: "5.8.3", source: "manual", supportsFastLoop: true }),
			pathExists: async (path) => existing.has(path),
			reviewStatuses: async () => STATUSES,
			editorConnected: async () => false,
			checkToolchain: async () => ({ ok: true, tool: "vswhere", message: "Visual Studio is ready.", problems: [] }),
			saveRefusal: () => null,
			saveLoadRecovery: () => ({ kind: "none" }),
			...overrides,
		};
	}

	it("reports the engine, a built sandbox, the resolved provider, the loop mode, and the editor connection", async () =>
	{
		const status = await new EnvironmentStatusReader(sources()).read();

		expect(status).toEqual({
			engine: { path: "/Engines/UE_5.8", version: "5.8.3", source: "manual", supportsFastLoop: true },
			sandbox: { path: "/Sandboxes/DojoSandbox", ready: true },
			reviewProvider: STATUSES[1],
			loopMode: "headless",
			editorConnected: false,
			engineProblem: null,
			toolchain: { ok: true, tool: "vswhere", message: "Visual Studio is ready.", problems: [] },
			saveNotice: null,
		});
	});

	it("blanks only the part whose source fails, and never throws", async () =>
	{
		const status = await new EnvironmentStatusReader(sources({
			inspectEngine: async () => { throw new AppErrorException("engine-not-found", "Gone.", "Pick it again."); },
			pathExists: async (path) => path.endsWith("Dojo.uproject"),
			reviewStatuses: async () => { throw new Error("selector broke"); },
			editorConnected: async () => { throw new Error("no MCP"); },
		})).read();

		expect(status).toMatchObject({ engine: null, sandbox: { path: "/Sandboxes/DojoSandbox", ready: false }, reviewProvider: null, loopMode: "headless", editorConnected: false });
	});

	it("reports nothing set on a fresh install", async () =>
	{
		const { service } = createService();
		const status = await new EnvironmentStatusReader(sources({ currentSettings: () => service.current() })).read();

		expect(status).toMatchObject({ engine: null, sandbox: { path: null, ready: false }, loopMode: "auto" });
	});
});
