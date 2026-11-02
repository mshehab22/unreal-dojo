// Keeps what an editor that never answered MCP left behind, so a timeout in an engine integration test can be explained after the suite deletes its temp sandbox (W13, A1270).
import { cp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { processesMentioning } from "./processesMentioning";

/** What the caller knows about the editor session when the wait ended: running, not running, or no session at all. */
export type EditorSessionState = "running" | "not running" | "no session";

/** What to keep and where. `keepRoot`, `now`, and `findProcesses` are only for tests; the suites use the defaults. */
export interface KeepEditorTimeoutEvidenceRequest
{
	readonly sandboxFolder: string;
	readonly label: string;
	readonly sessionState: EditorSessionState;
	readonly keepRoot?: string;
	readonly now?: () => Date;
	readonly findProcesses?: (folder: string) => string;
}

/** The label with every character a folder name cannot hold replaced by a dash. */
function safeLabel(label: string): string
{
	return label.replace(/[^A-Za-z0-9_-]+/g, "-");
}

/** The processes still mentioning the sandbox, as one line of text, or the reason the query failed. Never throws. */
function liveProcesses(sandboxFolder: string, findProcesses: (folder: string) => string): string
{
	try
	{
		const found = findProcesses(sandboxFolder);

		return found === "" ? "no process mentions the sandbox" : `processes mentioning the sandbox: ${found.split(/\r?\n/).join(" || ")}`;
	}
	catch (error)
	{
		return `the process query failed: ${error instanceof Error ? error.message : String(error)}`;
	}
}

/** Copies the sandbox's Saved/Logs to a kept folder named dojo-reopen-timeout-<label>-<timestamp> under the OS temp dir and returns a sentence for the assertion message: where the logs are, whether the editor was alive, and which processes held the sandbox. Never throws, so it cannot hide the timeout it explains. */
export async function keepEditorTimeoutEvidence(request: KeepEditorTimeoutEvidenceRequest): Promise<string>
{
	const stamp = (request.now?.() ?? new Date()).toISOString().replace(/[:.]/g, "-");
	const keptFolder = join(request.keepRoot ?? tmpdir(), `dojo-reopen-timeout-${safeLabel(request.label)}-${stamp}`);
	const alive = `Editor session: ${request.sessionState}; ${liveProcesses(request.sandboxFolder, request.findProcesses ?? processesMentioning)}.`;

	try
	{
		await mkdir(keptFolder, { recursive: true });
		await cp(join(request.sandboxFolder, "Saved", "Logs"), keptFolder, { recursive: true });

		return `${alive} The editor's Saved/Logs were kept in ${keptFolder}.`;
	}
	catch (error)
	{
		return `${alive} The editor's Saved/Logs could not be kept in ${keptFolder}: ${error instanceof Error ? error.message : String(error)}.`;
	}
}
