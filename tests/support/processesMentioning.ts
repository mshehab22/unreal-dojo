// Lists the processes whose command line mentions a folder, for the "no process left behind" checks of the engine integration tests (A182).
import { spawnSync } from "node:child_process";

/** The environment variable that carries the folder to the PowerShell query, so the query's own command line never contains it. */
const QUERY_VARIABLE = "DOJO_PROCESS_QUERY";

/** The PowerShell query: every process other than itself whose command line contains the folder, one `pid name commandline` line each. */
const WINDOWS_QUERY = [
	"Get-CimInstance Win32_Process",
	`| Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -and $_.CommandLine.IndexOf($env:${QUERY_VARIABLE}, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 }`,
	'| ForEach-Object { "$($_.ProcessId) $($_.Name) $($_.CommandLine)" }',
].join(" ");

/** The lines of every process still mentioning the folder on its command line, or an empty string when none does. Uses PowerShell on Windows and pgrep elsewhere; neither matches its own query. */
export function processesMentioning(folder: string): string
{
	if (process.platform !== "win32") return spawnSync("pgrep", ["-fl", folder], { encoding: "utf8" }).stdout.trim();

	const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_QUERY], { encoding: "utf8", env: { ...process.env, [QUERY_VARIABLE]: folder }, windowsHide: true });

	if (result.status !== 0) throw new Error(`The process query failed (status ${result.status}): ${result.stderr}`);

	return result.stdout.trim();
}
