// Test stand-ins for the settings file and safeStorage.
import type { EngineInstall } from "@shared/types/engine";

import { AppErrorException } from "../../src/main/errors/AppErrorException";
import type { SecretEncryptor } from "../../src/main/services/settings/SecretEncryptor";
import type { SettingsChecks } from "../../src/main/services/settings/SettingsChecks";

export { MemorySettingsStore } from "../../src/main/services/settings/MemorySettingsStore";

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

/** Folder checks where `/Engines/...` folders are 5.8 engines (an `Engine` subfolder resolves to its parent) and listed folders are sandboxes. */
export class FakeSettingsChecks implements SettingsChecks
{
	/** Folders that hold `Dojo.uproject`. */
	readonly sandboxFolders = new Set<string>(["/Sandboxes/DojoSandbox"]);

	/** Answers an engine for `/Engines/...` and the locator's `engine-not-found` for anything else. */
	async inspectEngine(folder: string): Promise<EngineInstall>
	{
		if (!folder.startsWith("/Engines/")) throw new AppErrorException("engine-not-found", "That folder is not an Unreal Engine install.", "Pick the folder that contains Engine.", folder);

		return { path: folder.replace(/\/Engine$/, ""), version: "5.8.3", source: "manual", supportsFastLoop: true };
	}

	/** True for the listed sandbox folders. */
	async isSandboxProject(folder: string): Promise<boolean>
	{
		return this.sandboxFolders.has(folder);
	}
}
