// Remembers the sandbox folder in the app's electron-store file until the settings service owns it (A186).
import Store from "electron-store";

import type { SandboxPathStore } from "./SandboxPathStore";

/** Writes `sandboxPath` into electron-store's default file, the same key `Settings.sandboxPath` uses, so the settings service reads it without a migration. */
export class ElectronStoreSandboxPathStore implements SandboxPathStore
{
	private readonly store = new Store<{ sandboxPath: string | null }>();

	/** Saves the sandbox project folder. */
	setSandboxPath(sandboxPath: string): void
	{
		this.store.set("sandboxPath", sandboxPath);
	}
}
