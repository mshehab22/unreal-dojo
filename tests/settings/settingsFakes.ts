// Test stand-ins for the settings file and safeStorage.
import type { SecretEncryptor } from "../../src/main/services/settings/SecretEncryptor";
import type { SettingsStore } from "../../src/main/services/settings/SettingsStore";

/** A settings file kept in memory, with a copy of what is "on disk" for assertions. */
export class MemorySettingsStore implements SettingsStore
{
	/** What a real file would hold. */
	readonly values: Record<string, unknown>;

	/** Starts with the given stored values. */
	constructor(initialValues: Record<string, unknown> = {})
	{
		this.values = { ...initialValues };
	}

	/** Every stored value. */
	readAll(): Record<string, unknown>
	{
		return { ...this.values };
	}

	/** Writes the given values. */
	write(values: Record<string, unknown>): void
	{
		Object.assign(this.values, values);
	}

	/** Removes one value. */
	remove(key: string): void
	{
		delete this.values[key];
	}
}

/** A safeStorage stand-in that "encrypts" by reversing the text, and can be switched off like a locked keychain. */
export class FakeSecretEncryptor implements SecretEncryptor
{
	/** False makes `isEncryptionAvailable` answer false. */
	available = true;

	/** True makes `encryptString` throw like an OS failure. */
	failEncryption = false;

	/** Answers whether encryption can be used. */
	isEncryptionAvailable(): boolean
	{
		return this.available;
	}

	/** Reverses the text into a buffer, so the stored bytes never equal the key. */
	encryptString(text: string): Buffer
	{
		if (this.failEncryption) throw new Error("Error while encrypting the text provided to safeStorage.encryptString.");

		return Buffer.from([...text].reverse().join(""), "utf8");
	}

	/** Undoes `encryptString`, for checking the round trip. */
	decryptString(encrypted: Buffer): string
	{
		return [...encrypted.toString("utf8")].reverse().join("");
	}
}
