// The file system calls the sandbox service and quest writer need, behind an interface so tests can use an in-memory fake.

/** Reads, writes, copies, and removes files. Missing paths are not errors for reads and removals. */
export interface SandboxFileSystem
{
	/** Returns the file's text with any byte order mark removed, or null when it is missing. */
	readTextFile(filePath: string): Promise<string | null>;

	/** Writes a new file (removing any older one first, so its modification time is now), creating parent folders. */
	writeTextFile(filePath: string, text: string): Promise<void>;

	/** Removes a file if it exists. */
	removeFile(filePath: string): Promise<void>;

	/** Removes a folder and everything in it, if it exists. */
	removeFolder(folderPath: string): Promise<void>;

	/** Names of the files (not folders) directly inside a folder, or an empty list when it is missing. */
	listFiles(folderPath: string): Promise<string[]>;

	/** Names of every entry directly inside a folder, or an empty list when it is missing. */
	listEntries(folderPath: string): Promise<string[]>;

	/** Copies a folder tree, skipping top-level entries named in `skipNames`. Copied files get the current time. */
	copyFolder(fromFolder: string, toFolder: string, skipNames: string[]): Promise<void>;

	/** Makes a folder and its parents. */
	makeFolder(folderPath: string): Promise<void>;

	/** The folder's path with every symbolic link resolved (macOS temp folders live behind `/var` to `/private/var`). Throws when it is missing. */
	realPath(folderPath: string): Promise<string>;

	/** Makes a new empty folder under the system temp folder and returns its path. */
	makeTemporaryFolder(prefix: string): Promise<string>;
}
