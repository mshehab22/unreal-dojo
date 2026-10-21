// The learner's settings: read once from disk, kept in memory, written through on every change. The API key goes through safeStorage only.
import type { Settings, SettingsPatch } from "@shared/types/settings";

import { AppErrorException } from "../../errors/AppErrorException";
import type { SecretEncryptor } from "./SecretEncryptor";
import type { SettingsStore } from "./SettingsStore";
import { hasStoredApiKey, readStoredSettings, STORED_KEYS } from "./storedSettings";

/** Builds the error for a computer where safeStorage cannot encrypt. The key is never part of the error. */
function secureStorageUnavailable(detail?: string): AppErrorException
{
	return new AppErrorException(
		"secure-storage-unavailable",
		"Unreal Dojo cannot store your API key safely on this computer right now.",
		"On macOS, unlock your login keychain; on Windows, sign in to your own user account. Then save the key again. Claude Code and tests-only review still work without a key.",
		detail,
	);
}

/**
 * Owns the settings file. `current()` is synchronous, so services read settings through a closure
 * (`() => settingsService.current()`) and see a change at once, with no restart. Implements the sandbox
 * service's path store, so the sandbox folder lands in the same settings.
 */
export class SettingsService
{
	private settings: Settings;

	/** Reads the settings file once. Missing or invalid values fall back to their defaults one by one. */
	constructor(private readonly store: SettingsStore, private readonly encryptor: SecretEncryptor, private readonly now: () => Date = () => new Date())
	{
		this.settings = this.readFromStore();
	}

	/** The settings as they are now. Never holds the API key, only `hasApiKey`. */
	current(): Settings
	{
		return this.settings;
	}

	/** Applies a patch the IPC boundary already validated, writes it, and returns the new settings. */
	update(patch: SettingsPatch): Settings
	{
		const values = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));

		this.store.write(values);
		this.settings = { ...this.settings, ...values };

		return this.settings;
	}

	/** Encrypts and stores the API key. Throws `secure-storage-unavailable` when safeStorage cannot encrypt; the key is never logged or kept in plain text. */
	setApiKey(apiKey: string): void
	{
		if (!this.encryptor.isEncryptionAvailable()) throw secureStorageUnavailable();

		let encrypted: Buffer;

		try
		{
			encrypted = this.encryptor.encryptString(apiKey);
		}
		catch (error)
		{
			// The safeStorage message names the OS failure only; it never contains the text being encrypted.
			throw secureStorageUnavailable(error instanceof Error ? error.message : undefined);
		}

		this.store.write({ [STORED_KEYS.apiKeyEncrypted]: encrypted.toString("base64") });
		this.settings = { ...this.settings, hasApiKey: true };
	}

	/** Deletes the stored API key. Safe to call when none is stored. */
	clearApiKey(): void
	{
		this.store.remove(STORED_KEYS.apiKeyEncrypted);
		this.settings = { ...this.settings, hasApiKey: false };
	}

	/** The encrypted key bytes for the review service to decrypt when a review needs them (A149), or null when none is stored. */
	async loadEncryptedApiKey(): Promise<Buffer | null>
	{
		const stored = this.store.readAll()[STORED_KEYS.apiKeyEncrypted];

		return typeof stored === "string" && stored.length > 0 ? Buffer.from(stored, "base64") : null;
	}

	/** Marks first-run setup finished. Throws `settings-invalid` while the engine or the sandbox is still missing. Keeps the first finish time. */
	completeFirstRun(): Settings
	{
		if (this.settings.enginePath === null || this.settings.sandboxPath === null)
		{
			throw new AppErrorException("settings-invalid", "Setup is not finished yet.", "Pick an engine and create the sandbox first, then finish setup.", `enginePath ${this.settings.enginePath === null ? "missing" : "set"}, sandboxPath ${this.settings.sandboxPath === null ? "missing" : "set"}`);
		}

		if (this.settings.firstRunCompletedAt !== null) return this.settings;

		const firstRunCompletedAt = this.now().toISOString();

		this.store.write({ [STORED_KEYS.firstRunCompletedAt]: firstRunCompletedAt });
		this.settings = { ...this.settings, firstRunCompletedAt };

		return this.settings;
	}

	/** Records the sandbox folder (the sandbox service's `SandboxPathStore`). */
	setSandboxPath(sandboxPath: string): void
	{
		this.update({ sandboxPath });
	}

	/** Reads every setting from the store. */
	private readFromStore(): Settings
	{
		const stored = this.store.readAll();

		return { ...readStoredSettings(stored), hasApiKey: hasStoredApiKey(stored) };
	}
}
