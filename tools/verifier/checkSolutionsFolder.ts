// Checks the `--solutions` folder before a run, so a mistyped path (for example one whose backslashes a shell ate) fails loudly instead of judging nothing.
import { stat } from "node:fs/promises";

/** Why `folder` cannot be used as the reference solutions folder, or undefined when it is a folder that exists. */
export async function solutionsFolderProblem(folder: string): Promise<string | undefined>
{
	const found = await stat(folder).catch(() => undefined);

	if (found === undefined) return `--solutions folder "${folder}" does not exist (a shell may have eaten a backslash; quote the path or use forward slashes)`;
	if (!found.isDirectory()) return `--solutions "${folder}" is not a folder`;

	return undefined;
}
