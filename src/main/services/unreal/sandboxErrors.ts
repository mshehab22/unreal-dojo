// Plain-English errors the sandbox service raises.
import { AppErrorException } from "../../errors/AppErrorException";

/** The chosen sandbox folder already holds something else. */
export function sandboxFolderNotEmpty(folder: string): AppErrorException
{
	return new AppErrorException("sandbox-copy-failed", "The sandbox folder already has files in it.", "Pick an empty folder, or use Rebuild sandbox in Settings to rebuild an existing one.", folder);
}

/** Copying the template or writing the project file failed. */
export function sandboxCopyFailed(folder: string, detail: string): AppErrorException
{
	return new AppErrorException("sandbox-copy-failed", "The sandbox project could not be created in that folder.", "Check that the folder is writable and the disk has space, then try again.", `${folder}: ${detail}`);
}

/** The folder has no `Dojo.uproject`, so there is nothing to rebuild. */
export function sandboxNotReady(folder: string): AppErrorException
{
	return new AppErrorException("sandbox-not-ready", "There is no sandbox project in that folder.", "Create the sandbox again from Settings.", folder);
}

/** The learner cancelled. */
export function runCancelled(): AppErrorException
{
	return new AppErrorException("run-cancelled", "Cancelled.", "Start it again when you are ready.");
}
