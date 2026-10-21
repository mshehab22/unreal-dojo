// The real settings file: electron-store's default `config.json` in the app's user data folder.
import Store from "electron-store";

import type { SettingsStore } from "./SettingsStore";

/** Reads and writes electron-store's default file, the same file the sandbox service wrote `sandboxPath` to before this service existed (A186). */
export class ElectronSettingsStore implements SettingsStore
{
	private readonly store = new Store<Record<string, unknown>>();

	/** Every stored value. */
	readAll(): Record<string, unknown>
	{
		return { ...this.store.store };
	}

	/** Writes the given values. */
	write(values: Record<string, unknown>): void
	{
		this.store.set(values);
	}

	/** Removes one value. */
	remove(key: string): void
	{
		this.store.delete(key);
	}
}
