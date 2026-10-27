// Refuses to start an engine integration run while another Unreal editor on this machine has Live Coding active: UnrealBuildTool will not build while any editor of the same engine install runs it (A1076).
import { spawnSync } from "node:child_process";

/** The PowerShell query: every Live Coding console process, one `pid commandline` line each. One console runs per editor project with Live Coding on. */
const WINDOWS_QUERY = 'Get-CimInstance Win32_Process -Filter "Name = \'LiveCodingConsole.exe\'" | ForEach-Object { "$($_.ProcessId) $($_.CommandLine)" }';

/** The Live Coding console processes running now (Windows), as `pid commandline` lines; an empty string when none runs or on another platform. */
export function liveCodingSessions(): string
{
	if (process.platform !== "win32") return "";

	const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_QUERY], { encoding: "utf8", windowsHide: true });

	if (result.status !== 0) throw new Error(`The Live Coding session query failed (status ${result.status}): ${result.stderr}`);

	return result.stdout.trim();
}

/** Throws a plain explanation when another editor has Live Coding active, so the run stops at once instead of failing every build with "Unable to build while Live Coding is active". */
export function assertNoForeignLiveCodingSession(): void
{
	const sessions = liveCodingSessions();

	if (sessions === "") return;

	throw new Error(`Another Unreal editor has Live Coding active, so UnrealBuildTool will refuse every build (A1076). Close that editor and run again. Live Coding consoles running:\n${sessions}`);
}
