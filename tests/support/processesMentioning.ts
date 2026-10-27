// Lists the processes whose command line mentions a folder, for the "no process left behind" checks of the engine integration tests (A182).
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";

/** The environment variable that carries the folder to the PowerShell query, so the query's own command line never contains it. */
const QUERY_VARIABLE = "DOJO_PROCESS_QUERY";

/** The second spelling of the same folder (the long form of an 8.3 short path), or an empty string when it has none. A child may be started with either. */
const QUERY_VARIABLE_LONG = "DOJO_PROCESS_QUERY_LONG";

/** The PowerShell query: every process other than itself whose command line contains the folder in either spelling, one `pid name commandline` line each. */
const WINDOWS_QUERY = [
	"Get-CimInstance Win32_Process",
	`| Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -and ($_.CommandLine.IndexOf($env:${QUERY_VARIABLE}, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 -or ($env:${QUERY_VARIABLE_LONG} -and $_.CommandLine.IndexOf($env:${QUERY_VARIABLE_LONG}, [System.StringComparison]::OrdinalIgnoreCase) -ge 0)) }`,
	'| ForEach-Object { "$($_.ProcessId) $($_.Name) $($_.CommandLine)" }',
].join(" ");

/** The lines of every process still mentioning the folder on its command line, or an empty string when none does. Uses PowerShell on Windows and pgrep elsewhere; neither matches its own query. */
export function processesMentioning(folder: string): string
{
	if (process.platform !== "win32") return spawnSync("pgrep", ["-fl", folder], { encoding: "utf8" }).stdout.trim();

	const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_QUERY], { encoding: "utf8", env: { ...process.env, [QUERY_VARIABLE]: folder, [QUERY_VARIABLE_LONG]: otherSpelling(folder) }, windowsHide: true });

	if (result.status !== 0) throw new Error(`The process query failed (status ${result.status}): ${result.stderr}`);

	return result.stdout.trim();
}

/** The folder's real path when it differs from the given spelling (`C:\\Users\\MOHAMM~1` against `C:\\Users\\Mohammad Shehab`), or an empty string when the folder is gone or spelled the same. */
export function otherSpelling(folder: string): string
{
	try
	{
		const real = realpathSync.native(folder);

		return real.toLowerCase() === folder.toLowerCase() ? "" : real;
	}
	catch
	{
		return "";
	}
}
