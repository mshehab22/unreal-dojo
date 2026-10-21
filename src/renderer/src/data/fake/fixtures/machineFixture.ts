// Engine installs, toolchain, sandbox folder, and review providers as this machine's fake would report them.
import type { EngineInstall, SandboxFolderChoice, ToolchainCheck } from "@shared/types/engine";
import type { ReviewProviderStatus } from "@shared/types/review";

const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);

/** Two installs: 5.8 from the launcher and an older 5.6 in a default folder. */
export function enginesFixture(): EngineInstall[]
{
	return isMac
		? [
			{ path: "/Users/Shared/Epic Games/UE_5.8", version: "5.8.3", source: "launcher", supportsFastLoop: true },
			{ path: "/Users/learner/Applications/UE_5.6", version: "5.6.1", source: "default-folder", supportsFastLoop: false },
		]
		: [
			{ path: "C:\\Program Files\\Epic Games\\UE_5.8", version: "5.8.3", source: "launcher", supportsFastLoop: true },
			{ path: "D:\\Engines\\UE_5.6", version: "5.6.1", source: "registry", supportsFastLoop: false },
		];
}

/** The install a manual folder pick returns. */
export function manualEngineFixture(): EngineInstall
{
	return isMac
		? { path: "/Volumes/Work/UE_5.7", version: "5.7.2", source: "manual", supportsFastLoop: false }
		: { path: "E:\\UE_5.7", version: "5.7.2", source: "manual", supportsFastLoop: false };
}

/** A toolchain that can build. */
export function toolchainFixture(): ToolchainCheck
{
	return isMac
		? { ok: true, tool: "xcode-select", message: "Xcode 27.1 is selected.", toolVersion: "27.1", problems: [] }
		: { ok: true, tool: "vswhere", message: "Visual Studio 2026 17.14 with the C++ game workload is installed.", toolVersion: "17.14", problems: [] };
}

/** The sandbox folder the fake's folder picker returns. On Windows it is long enough to earn the short path warning. */
export function sandboxFolderFixture(): SandboxFolderChoice
{
	return isMac
		? { path: "/Users/learner/Documents/UnrealDojo", warnings: [] }
		: {
			path: "C:\\Users\\learner\\OneDrive - Personal\\Documents\\Unreal Projects\\Practice\\UnrealDojo",
			warnings: ["This path is 86 characters long. Unreal builds can fail past 100, so a short folder such as C:\\Dojo is safer."],
		};
}

/** Where the sandbox project ends up inside the chosen folder. */
export function sandboxPathIn(folder: string): string
{
	return `${folder}${isMac ? "/" : "\\"}DojoSandbox`;
}

/** Claude Code found, no API key, tests only always there. */
export function reviewProvidersFixture(hasApiKey: boolean): ReviewProviderStatus[]
{
	return [
		{ id: "claude-code", available: true, version: "2.4.1" },
		hasApiKey
			? { id: "anthropic-api", available: true, version: "claude-sonnet-5-5" }
			: { id: "anthropic-api", available: false, reason: "No API key is stored." },
		{ id: "tests-only", available: true },
	];
}
