// Where settings live on disk, behind an interface so tests use memory instead of electron-store.

/** A flat key-value file of settings. Reads and writes are synchronous, as electron-store's are. */
export interface SettingsStore
{
	/** Every stored value, as read from disk (may hold old, missing, or hand-edited values). */
	readAll(): Record<string, unknown>;

	/** Writes the given values and keeps the rest. */
	write(values: Record<string, unknown>): void;

	/** Removes one value. */
	remove(key: string): void;
}
