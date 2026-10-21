// The two safeStorage calls the settings service uses to store the API key, so tests pass a fake instead of Electron's.

/** Electron's `safeStorage`, encryption side. */
export interface SecretEncryptor
{
	/** `safeStorage.isEncryptionAvailable()`: false when the OS keychain or credential store cannot be used. */
	isEncryptionAvailable(): boolean;

	/** `safeStorage.encryptString(text)`. */
	encryptString(text: string): Buffer;
}
