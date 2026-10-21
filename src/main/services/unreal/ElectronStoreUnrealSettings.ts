// Keeps the engine and sandbox folders in the app's electron-store file until the settings service owns them (A186, A400).
import Store from "electron-store";

import type { UnrealSettingsStore } from "./UnrealSettingsStore";

/** Writes `enginePath` and `sandboxPath` into electron-store's default file, the keys `Settings` uses, so the settings service reads them without a migration. */
export class ElectronStoreUnrealSettings implements UnrealSettingsStore
{
	private readonly store = new Store<{ enginePath: string | null; sandboxPath: string | null }>();

	/** The saved engine folder, or null. */
	getEnginePath(): string | null
	{
		return this.store.get("enginePath", null);
	}

	/** Saves the engine folder. */
	setEnginePath(enginePath: string): void
	{
		this.store.set("enginePath", enginePath);
	}

	/** The saved sandbox folder, or null. */
	getSandboxPath(): string | null
	{
		return this.store.get("sandboxPath", null);
	}

	/** Saves the sandbox folder. */
	setSandboxPath(sandboxPath: string): void
	{
		this.store.set("sandboxPath", sandboxPath);
	}
}
