// Review settings backed by the app's settings and Electron safeStorage. The settings service supplies the stored bytes; this only decrypts them.
import type { ReviewProviderSetting, Settings } from "@shared/types/settings";

import { AppErrorException } from "../../../errors/AppErrorException";
import { unavailableError } from "../reviewErrors";
import type { IReviewSettings } from "./IReviewSettings";

/** The two safeStorage calls used, so tests pass a fake instead of Electron's. */
export interface SecretDecryptor
{
	/** `safeStorage.isEncryptionAvailable()`. */
	isEncryptionAvailable(): boolean;

	/** `safeStorage.decryptString(buffer)`. */
	decryptString(encrypted: Buffer): string;
}

/** Where the settings come from: the current settings and the encrypted key bytes the settings service stored. */
export interface ReviewSettingsSources
{
	/** The current settings (`SettingsService.current()` in the app). */
	currentSettings: () => Pick<Settings, "reviewProvider" | "modelId" | "hasApiKey">;

	/** The encrypted API key as stored, or null when none is stored. */
	loadEncryptedApiKey: () => Promise<Buffer | null>;

	/** Electron's safeStorage. */
	decryptor: SecretDecryptor;
}

/** Reads review settings through closures and decrypts the API key with safeStorage only when a review needs it. */
export class SafeStorageReviewSettings implements IReviewSettings
{
	/** Keeps the sources. */
	constructor(private readonly sources: ReviewSettingsSources)
	{
	}

	/** The provider the learner picked. */
	providerChoice(): ReviewProviderSetting
	{
		return this.sources.currentSettings().reviewProvider;
	}

	/** Model id for the API provider. */
	modelId(): string
	{
		return this.sources.currentSettings().modelId;
	}

	/** True when a key is stored. */
	hasApiKey(): boolean
	{
		return this.sources.currentSettings().hasApiKey;
	}

	/** Loads and decrypts the key. Throws secure-storage-unavailable or review-unavailable when the key cannot be decrypted. */
	async readApiKey(): Promise<string | null>
	{
		const encrypted = await this.sources.loadEncryptedApiKey();
		if (encrypted === null) return null;

		if (!this.sources.decryptor.isEncryptionAvailable())
		{
			throw new AppErrorException("secure-storage-unavailable", "The stored API key cannot be read because secure storage is not available.", "Sign in to your computer's keychain, then try again.");
		}

		try
		{
			const apiKey = this.sources.decryptor.decryptString(encrypted).trim();

			return apiKey.length > 0 ? apiKey : null;
		}
		catch (error)
		{
			throw unavailableError("The stored API key could not be decrypted.", "Enter the key again in Settings.", error instanceof Error ? error.message : undefined);
		}
	}
}
