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

/** The picked folder cannot hold a sandbox at all; `reason` is the rule's plain-English sentence. */
export function sandboxPathUnsupported(folder: string, reason: string): AppErrorException
{
	return new AppErrorException("sandbox-path-unsupported", reason, "Pick a different folder, one that is outside the Unreal Engine folder and on this computer's own disk.", folder);
}

/** The sandbox folder in Settings no longer holds `Dojo.uproject`: it was moved or deleted. */
export function sandboxMovedOrDeleted(folder: string): AppErrorException
{
	return new AppErrorException("sandbox-not-ready", `The sandbox folder was moved or deleted, so there is no project to build in at ${folder}.`, "Put the folder back where it was, or set the sandbox up again from Settings, then run again.", folder);
}

/** The learner cancelled. */
export function runCancelled(): AppErrorException
{
	return new AppErrorException("run-cancelled", "Cancelled.", "Start it again when you are ready.");
}
