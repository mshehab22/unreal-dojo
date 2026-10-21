// The few file operations the save file needs, injected so tests can simulate a crash mid-write.

/** File operations used by AtomicJsonFile. NodeFileSystem is the real one. */
export interface FileSystem
{
	/** Reads a whole UTF-8 file. Rejects with code ENOENT when it does not exist. */
	readText(path: string): Promise<string>;

	/** Writes a whole UTF-8 file and flushes it to disk before resolving. */
	writeTextDurably(path: string, text: string): Promise<void>;

	/** Renames a file, replacing the destination (atomic on the same volume). */
	rename(fromPath: string, toPath: string): Promise<void>;

	/** Copies a file, replacing the destination. */
	copy(fromPath: string, toPath: string): Promise<void>;

	/** Deletes a file if it exists. */
	removeIfPresent(path: string): Promise<void>;

	/** Creates a folder and its parents if missing. */
	ensureFolder(path: string): Promise<void>;
}
