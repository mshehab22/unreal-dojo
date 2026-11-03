// Plain-English errors the sandbox service raises.
import { AppErrorException } from "../../errors/AppErrorException";

/** The chosen sandbox folder already holds something else. */
export function sandboxFolderNotEmpty(folder: string): AppErrorException
{
	return new AppErrorException("sandbox-copy-failed", "The sandbox folder already has files in it.", "Choose another folder, or move the files out of this one first. To rebuild the sandbox you already have, use Rebuild sandbox in Settings instead.", folder);
}

/** Copying the template or writing the project file failed. */
export function sandboxCopyFailed(folder: string, detail: string): AppErrorException
{
	return new AppErrorException("sandbox-copy-failed", "The sandbox project could not be created in that folder.", "Check that the folder is writable and the disk has space, then try again.", `${folder}: ${detail}`);
}

/** The folder has no `Dojo.uproject`, so there is nothing to rebuild. */
export function sandboxNotReady(folder: string): AppErrorException
{
	return new AppErrorException("sandbox-not-ready", "There is no sandbox project in that folder.", "Put the sandbox folder back where it was, or open Settings and choose Set up the sandbox again to create a new one.", folder);
}

/** The picked folder cannot hold a sandbox at all; `reason` is the rule's plain-English sentence. */
export function sandboxPathUnsupported(folder: string, reason: string): AppErrorException
{
	return new AppErrorException("sandbox-path-unsupported", reason, "Pick a different folder, one that is outside the Unreal Engine folder.", folder);
}

/** `Dojo.uproject` could not be read in the sandbox folder in Settings. The reader answers the same for a moved folder, a deleted one, a locked one, and a drive that is not connected, so the wording covers them all. */
export function sandboxMovedOrDeleted(folder: string): AppErrorException
{
	return new AppErrorException("sandbox-not-ready", `The sandbox project could not be found at ${folder}. The folder may have been moved, renamed or deleted, or its drive is not connected.`, "Put the folder back where it was (or reconnect its drive), or open Settings and choose Set up the sandbox again to create a new one. Your progress is kept. Then run again.", folder);
}

/** The learner cancelled. */
export function runCancelled(): AppErrorException
{
	return new AppErrorException("run-cancelled", "Cancelled.", "Start it again when you are ready.");
}
