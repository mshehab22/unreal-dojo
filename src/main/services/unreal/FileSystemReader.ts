// The file system calls the engine locator needs, behind an interface so tests can use an in-memory fake.

/** Reads files and lists folders. Never throws for a missing path; it answers null or an empty list instead. */
export interface FileSystemReader
{
	/** Returns the file's text with any byte order mark removed, or null when the file is missing or unreadable. */
	readTextFile(filePath: string): Promise<string | null>;

	/** Returns the names of the folders directly inside a folder, or an empty list when the folder is missing. */
	listFolders(folderPath: string): Promise<string[]>;
}
