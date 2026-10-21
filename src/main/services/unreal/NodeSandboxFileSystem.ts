// The real SandboxFileSystem, backed by node:fs.
import { cp, mkdir, mkdtemp, readdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, sep } from "node:path";

import type { SandboxFileSystem } from "./SandboxFileSystem";

/** Works on the real disk. */
export class NodeSandboxFileSystem implements SandboxFileSystem
{
	/** Reads UTF-8 and strips a byte order mark; null when missing. */
	async readTextFile(filePath: string): Promise<string | null>
	{
		try
		{
			const text = await readFile(filePath, "utf8");

			return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
		}
		catch
		{
			return null;
		}
	}

	/** Removes the old file, then writes a new one, so UBT always sees a fresh modification time. */
	async writeTextFile(filePath: string, text: string): Promise<void>
	{
		await mkdir(dirname(filePath), { recursive: true });
		await rm(filePath, { force: true });
		await writeFile(filePath, text, "utf8");
	}

	/** Removes a file; a missing file is fine. */
	async removeFile(filePath: string): Promise<void>
	{
		await rm(filePath, { force: true });
	}

	/** Removes a folder tree; a missing folder is fine. */
	async removeFolder(folderPath: string): Promise<void>
	{
		await rm(folderPath, { recursive: true, force: true });
	}

	/** Lists file names. */
	async listFiles(folderPath: string): Promise<string[]>
	{
		try
		{
			const entries = await readdir(folderPath, { withFileTypes: true });

			return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
		}
		catch
		{
			return [];
		}
	}

	/** Lists every entry name. */
	async listEntries(folderPath: string): Promise<string[]>
	{
		try
		{
			return await readdir(folderPath);
		}
		catch
		{
			return [];
		}
	}

	/** Copies with `fs.cp`, skipping the named top-level entries; timestamps are not preserved. */
	async copyFolder(fromFolder: string, toFolder: string, skipNames: string[]): Promise<void>
	{
		await cp(fromFolder, toFolder, {
			recursive: true,
			preserveTimestamps: false,
			filter: (source) =>
			{
				const relativePath = relative(fromFolder, source);
				const topLevelName = relativePath.split(sep)[0] ?? "";

				return relativePath === "" || (!skipNames.includes(topLevelName) && basename(source) !== ".DS_Store");
			},
		});
	}

	/** Makes the folder tree. */
	async makeFolder(folderPath: string): Promise<void>
	{
		await mkdir(folderPath, { recursive: true });
	}

	/** `fs.realpath`. */
	async realPath(folderPath: string): Promise<string>
	{
		return realpath(folderPath);
	}

	/** `mkdtemp` under the system temp folder. */
	async makeTemporaryFolder(prefix: string): Promise<string>
	{
		return mkdtemp(join(tmpdir(), prefix));
	}
}
