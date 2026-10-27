// Engine installs, toolchain, sandbox folder, and review providers as this machine's fake would report them.
import type { EngineInstall, SandboxFolderChoice, ToolchainCheck } from "@shared/types/engine";
import type { AppError } from "@shared/types/errors";
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

/** A toolchain with the C++ pieces missing, so a build cannot start (the `toolchain-missing` scenario). */
export function missingToolchainFixture(): ToolchainCheck
{
	const error: AppError = isMac
		? {
			code: "toolchain-missing",
			message: "Xcode's command line tools are not installed, so Unreal cannot compile C++ on this Mac.",
			suggestedAction: "Open Terminal, run xcode-select --install, wait for it to finish, then check again.",
		}
		: {
			code: "toolchain-missing",
			message: "Visual Studio is installed, but its C++ game development workload is missing, so Unreal cannot compile C++.",
			suggestedAction: "Open the Visual Studio Installer, choose Modify, tick Game development with C++, install it, then check again.",
		};

	return {
		ok: false,
		tool: isMac ? "xcode-select" : "vswhere",
		message: error.message,
		problems: [{ error, blocksBuild: true }],
		suggestedAction: error.suggestedAction,
	};
}

/** The notice that your save was restored from its backup, which the main process repeats on every read of the environment for the whole session (the `save-notice` scenario). */
export function saveNoticeFixture(): AppError
{
	return {
		code: "save-failed",
		message: "Your save file could not be read, so Unreal Dojo restored your progress from its backup copy.",
		suggestedAction: "Nothing to do. You may have lost your last few minutes of progress.",
		detail: "progress.json was unreadable; progress.json.bak was loaded instead.",
	};
}

/** Why the engine in settings cannot be used: its folder is gone (the `engine-missing` scenario). */
export function missingEngineFixture(enginePath: string): AppError
{
	return {
		code: "engine-not-found",
		message: "The Unreal Engine folder is gone. Nothing is at the place Unreal Dojo remembers.",
		suggestedAction: "Pick the engine folder again in Settings, or install Unreal Engine 5.8 and choose it.",
		detail: `Expected the engine at ${enginePath}`,
	};
}

/** The reason a sandbox setup fails when the build tools, not the template, are at fault (the `sandbox-setup-fails` scenario). */
export function sandboxSetupFailureFixture(): AppError
{
	return {
		code: "build-environment-failed",
		message: "Unreal's build tools could not run, so the sandbox was not built. Your code is not the problem.",
		suggestedAction: "Close Unreal Editor if it is open, then build again. If it keeps failing, check the build tools in Settings.",
		detail: "UnrealBuildTool exited with code 6 before compiling any file.",
	};
}

/** A sandbox folder that cannot be used because it sits inside the engine folder (the `folder-blocked` scenario). */
export function blockedSandboxFolderFixture(enginePath: string): SandboxFolderChoice
{
	return {
		path: `${enginePath}${isMac ? "/" : "\\"}Samples`,
		warnings: [],
		blockers: ["This folder is inside the Unreal Engine folder. Updating or reinstalling the engine could erase the sandbox, so pick a folder outside it."],
	};
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
