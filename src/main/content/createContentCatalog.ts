// Builds the real ContentCatalog: the content-engine's ContentLoader on a folder, with the file system check.
import { stat } from "node:fs/promises";

import { ContentLoader } from "../services/content";
import { ContentCatalog } from "./ContentCatalog";

/** Tells whether a path is an existing folder. */
async function isFolder(path: string): Promise<boolean>
{
	try
	{
		return (await stat(path)).isDirectory();
	}
	catch
	{
		return false;
	}
}

/** Returns a catalog that reads `root` with the ContentLoader. Nothing is read until it starts loading. */
export function createContentCatalog(root: string): ContentCatalog
{
	const loader = new ContentLoader(root);

	return new ContentCatalog({ root, folderExists: isFolder, loadContent: () => loader.load() });
}
