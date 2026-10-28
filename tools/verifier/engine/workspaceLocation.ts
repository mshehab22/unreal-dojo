// Where the verifier keeps its persistent engine workspaces: outside Temp, one folder per engine version (W14, A1280).
import { posix, win32 } from "node:path";

/** The environment variable that moves the workspace root, below the `--workspace` flag in priority. */
export const WORKSPACE_ENVIRONMENT_VARIABLE = "DOJO_VERIFY_WORKSPACE";

/** What decides the workspace root. */
export interface WorkspaceLocationInputs
{
	/** The `--workspace` flag, when given. */
	flag?: string;

	/** `process.platform`. */
	platform: NodeJS.Platform;
	homeFolder: string;
	environment: Readonly<Record<string, string | undefined>>;
}

/**
 * The folder that holds one verify workspace per engine version: the flag, else the environment variable, else a per-user
 * folder (`~\.unreal-dojo\verify` on Windows, `~/Library/Caches/UnrealDojo/verify-workspace` on macOS).
 * Windows is not under AppData on purpose: the Claude desktop app is an MSIX package, and Windows redirects the writes of a
 * packaged app to AppData\Local into the package's own storage (`...\AppData\Local\Packages\Claude_...\LocalCache\Local\...`), a
 * path about 47 characters longer that is also hidden from the user and lost when the app is reset. The home folder is not
 * redirected, and `C:\Users\<name>\.unreal-dojo\verify\5.8` stays well under the 100 characters the build wants.
 */
export function resolveWorkspaceRoot(inputs: WorkspaceLocationInputs): string
{
	const path = inputs.platform === "win32" ? win32 : posix;
	const configured = inputs.flag ?? inputs.environment[WORKSPACE_ENVIRONMENT_VARIABLE];

	if (configured !== undefined && configured.trim() !== "") return path.resolve(configured);

	if (inputs.platform === "win32") return path.join(inputs.homeFolder, ".unreal-dojo", "verify");

	if (inputs.platform === "darwin") return path.join(inputs.homeFolder, "Library", "Caches", "UnrealDojo", "verify-workspace");

	return path.join(inputs.environment["XDG_CACHE_HOME"] ?? path.join(inputs.homeFolder, ".cache"), "UnrealDojo", "verify-workspace");
}
