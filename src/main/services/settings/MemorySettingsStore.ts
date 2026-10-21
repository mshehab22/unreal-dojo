// A settings store kept in memory: the last resort when the settings file cannot be used at all, and the store tests use.
import type { SettingsStore } from "./SettingsStore";

/** Holds settings in memory only; nothing survives a restart. */
export class MemorySettingsStore implements SettingsStore
{
	/** What a real file would hold. */
	readonly values: Record<string, unknown>;

	/** Starts with the given values. */
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
