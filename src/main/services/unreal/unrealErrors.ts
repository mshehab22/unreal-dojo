// Every plain-English error the engine locator, the toolchain checks, and the build failure explainer can raise, in one place so the wording stays consistent.
import type { AppError } from "@shared/types/errors";

/** No engine was found in the launcher list, the registry, or the default folders. */
export function noEngineFound(): AppError
{
	return {
		code: "engine-not-found",
		message: "No Unreal Engine install was found on this computer.",
		suggestedAction: "Install Unreal Engine 5.4 or later from the Epic Games Launcher, or pick the engine folder yourself if it is somewhere unusual.",
	};
}

/** The folder the learner picked has no `Engine/Build/Build.version`. */
export function engineFolderInvalid(folder: string): AppError
{
	return {
		code: "engine-not-found",
		message: "That folder does not look like an Unreal Engine install.",
		suggestedAction: "Pick the folder that contains the Engine folder, for example UE_5.8.",
		detail: `No Engine/Build/Build.version under ${folder}`,
	};
}

/** The engine is older than the oldest version the app supports (D10). */
export function engineVersionUnsupported(version: string, folder: string): AppError
{
	return {
		code: "engine-version-unsupported",
		message: `Unreal Engine ${version} is too old for Unreal Dojo, which needs 5.4 or later.`,
		suggestedAction: "Install Unreal Engine 5.8 (or at least 5.4) from the Epic Games Launcher and pick it instead.",
		detail: folder,
	};
}

/** vswhere is missing or found no Visual Studio at all. */
export function visualStudioMissing(): AppError
{
	return {
		code: "toolchain-missing",
		message: "Visual Studio is not installed. Unreal needs it to compile C++ on Windows.",
		suggestedAction: "Install Visual Studio 2022 (17.14 or later) or Visual Studio 2026 Community with the \"Game development with C++\" workload.",
	};
}

/** Visual Studio is installed but without the workload Unreal needs. */
export function visualStudioWorkloadMissing(displayName: string): AppError
{
	return {
		code: "toolchain-missing",
		message: `${displayName} is installed, but without the "Game development with C++" workload Unreal needs.`,
		suggestedAction: "Open the Visual Studio Installer, choose Modify, tick \"Game development with C++\", and install.",
	};
}

/** Visual Studio has the workload but is older than UE 5.8 accepts. */
export function visualStudioTooOld(displayName: string, version: string): AppError
{
	return {
		code: "toolchain-missing",
		message: `${displayName} ${version} is older than Unreal Engine 5.8 accepts (17.14 or later).`,
		suggestedAction: "Open the Visual Studio Installer and choose Update, or install Visual Studio 2026.",
	};
}

/** `xcode-select -p` failed: no developer folder is selected. */
export function xcodeNotSelected(): AppError
{
	return {
		code: "toolchain-missing",
		message: "Xcode is not installed or not selected. Unreal needs it to compile C++ on a Mac.",
		suggestedAction: "Install Xcode from the App Store, open it once, then run: sudo xcode-select -s /Applications/Xcode.app",
	};
}

/** Only the Command Line Tools are selected, which cannot build Unreal projects. */
export function commandLineToolsOnly(developerFolder: string): AppError
{
	return {
		code: "toolchain-missing",
		message: "Only the Command Line Tools are selected, and Unreal needs the full Xcode app.",
		suggestedAction: "Install Xcode from the App Store if it is missing, then run: sudo xcode-select -s /Applications/Xcode.app",
		detail: developerFolder,
	};
}

/** Xcode is selected but its license has not been accepted, so every build tool refuses to run. */
export function xcodeLicenseNotAccepted(): AppError
{
	return {
		code: "toolchain-missing",
		message: "Xcode is installed, but its license has not been accepted yet, so it will not build anything.",
		suggestedAction: "Run: sudo xcodebuild -license accept (or open Xcode once and agree).",
	};
}

/** Xcode is selected but `xcodebuild -version` failed for another reason. */
export function xcodeNotWorking(detail: string): AppError
{
	return {
		code: "toolchain-missing",
		message: "Xcode is selected but did not answer when asked for its version.",
		suggestedAction: "Open Xcode once so it can finish installing its components, then check again.",
		detail,
	};
}

/** Xcode 26 and later ship the Metal compiler as a separate download; without it the editor window cannot open (problems.md, M1.2a). */
export function metalToolchainMissing(detail: string): AppError
{
	return {
		code: "toolchain-missing",
		message: "The Metal toolchain is not installed. Builds and tests work, but the Unreal editor window will not open.",
		suggestedAction: "Run once in Terminal: xcodebuild -downloadComponent MetalToolchain",
		detail,
	};
}

/** The app is running on an operating system Unreal Dojo does not support. */
export function platformUnsupported(platform: string): AppError
{
	return {
		code: "toolchain-missing",
		message: "Unreal Dojo works with Unreal on Windows and macOS only.",
		suggestedAction: "Run Unreal Dojo on a Windows PC or a Mac.",
		detail: `process.platform is ${platform}`,
	};
}

/** The Unreal editor the learner opened has Live Coding on, and Unreal refuses to build next to it (message confirmed in the UE 5.8.3 build tool source). */
export function liveCodingBlocksBuild(detail: string): AppError
{
	return {
		code: "build-environment-failed",
		message: "The build was refused because an Unreal editor you opened is still running with Live Coding on. This is not a problem in your code.",
		suggestedAction: "Close that Unreal editor window (or press Ctrl+Alt+F11 inside it), then run again.",
		detail,
	};
}

/** The disk ran out of room during the build. */
export function diskFull(detail: string): AppError
{
	return {
		code: "build-environment-failed",
		message: "The build stopped because the disk is full. This is not a problem in your code.",
		suggestedAction: "Free some space (a build needs a few gigabytes), empty the Recycle Bin or Trash, then run again.",
		detail,
	};
}

/** Another program holds a file the build has to replace, usually an open Unreal editor or a virus scanner. */
export function fileInUse(detail: string): AppError
{
	return {
		code: "build-environment-failed",
		message: "The build could not replace a file because another program is using it. This is not a problem in your code.",
		suggestedAction: "Close any Unreal editor you opened, wait a few seconds, then run again. If it keeps happening, pause your virus scanner for the sandbox folder.",
		detail,
	};
}

/** A path the build uses is longer than Windows allows. */
export function pathTooLongForBuild(detail: string): AppError
{
	return {
		code: "sandbox-path-too-long",
		message: "The build failed because a file path in the sandbox is too long for Windows. This is not a problem in your code.",
		suggestedAction: "Create the sandbox again in a short folder such as C:\\Dojo from Settings, then run again.",
		detail,
	};
}

/** The build could not use Visual Studio, its C++ tools, or the Windows SDK. */
export function visualStudioNotUsableByBuild(detail: string): AppError
{
	return {
		code: "toolchain-missing",
		message: "Unreal could not find a usable Visual Studio C++ toolchain or Windows SDK, so it could not compile. This is not a problem in your code.",
		suggestedAction: "Open the Visual Studio Installer, choose Modify, make sure \"Game development with C++\" is ticked and up to date, then run again.",
		detail,
	};
}

/** The build could not use Xcode or its SDK. */
export function xcodeNotUsableByBuild(detail: string): AppError
{
	return {
		code: "toolchain-missing",
		message: "Unreal could not use Xcode to compile. This is not a problem in your code.",
		suggestedAction: "Install Xcode from the App Store, open it once, then run: sudo xcode-select -s /Applications/Xcode.app",
		detail,
	};
}

/** The build program or the headless editor could not be started, and the engine folder still looks like an engine. */
export function engineProgramWontStart(detail: string): AppError
{
	return {
		code: "build-environment-failed",
		message: "Unreal Dojo could not start one of the engine's programs, although the engine folder is still there. This is not a problem in your code.",
		suggestedAction: "In the Epic Games Launcher choose Verify on this engine, check that a virus scanner did not remove a file, then run again.",
		detail,
	};
}

/** A build or test run hit its time limit and was stopped. */
export function runTookTooLong(detail: string): AppError
{
	return {
		code: "build-environment-failed",
		message: "The run took longer than its time limit and was stopped. This is not a problem in your code.",
		suggestedAction: "Close other heavy programs and run again; the first build after an engine or sandbox change is the slowest.",
		detail,
	};
}

/** Unreal's build tool crashed while starting, several times, usually because another build began at the same moment. */
export function buildToolKeepsCrashing(detail: string): AppError
{
	return {
		code: "build-environment-failed",
		message: "The Unreal build tool stopped while starting, three times in a row. Another Unreal build may be starting at the same moment. This is not a problem in your code.",
		suggestedAction: "Wait for any other Unreal build or editor to finish, then run again.",
		detail,
	};
}

/** The headless editor ended without a usable test report. */
export function testReportMissing(detail: string): AppError
{
	return {
		code: "build-environment-failed",
		message: "Your code built, but the Unreal editor that runs the tests closed before it wrote a result. This is not a problem in your code.",
		suggestedAction: "Close any other Unreal editor, then run again. If it keeps happening, use Rebuild sandbox in Settings.",
		detail,
	};
}

/** The editor ran but none of this quest's tests were among the results. */
export function questTestsDidNotRun(detail: string): AppError
{
	return {
		code: "build-environment-failed",
		message: "Your code built, but the engine did not run this quest's tests, so there is no result yet. This is not a problem in your code.",
		suggestedAction: "Use Rebuild sandbox in Settings and run again. If it still happens, report this quest: its test names may not match.",
		detail,
	};
}

/** Any other pipeline problem the runners report. */
export function runStoppedOutsideCode(detail: string): AppError
{
	return {
		code: "build-environment-failed",
		message: "The run stopped before it finished, for a reason outside your code.",
		suggestedAction: "Run again. If it keeps happening, use Rebuild sandbox in Settings.",
		detail,
	};
}

/** The build broke in an earlier quest's code the learner saved. */
export function earlierQuestBreaksBuild(questIds: string[], detail: string): AppError
{
	const names = questIds.join(", ");

	return {
		code: "build-environment-failed",
		message: `This quest cannot build because code from an earlier quest (${names}) has an error. The error is not in this quest.`,
		suggestedAction: `Open ${names} and fix the error its build output shows (or reset it), then come back and run this quest again.`,
		detail,
	};
}

/** The build broke in an earlier quest's reference solution, which is a lesson bug. */
export function referenceSolutionBroken(questIds: string[], detail: string): AppError
{
	const names = questIds.join(", ");

	return {
		code: "build-environment-failed",
		message: `This quest cannot build because the reference code Unreal Dojo uses for an earlier quest (${names}) has an error. That is a bug in the lesson, not in your code.`,
		suggestedAction: "Please report it with the details below, which name the file.",
		detail,
	};
}

/** The build broke in the sandbox's support code, template, or the engine, not in any quest. */
export function supportOrEngineCodeBroken(detail: string): AppError
{
	return {
		code: "build-environment-failed",
		message: "The build failed in the sandbox's support code or in the engine, not in your quest. This is not a problem in your code.",
		suggestedAction: "Use Rebuild sandbox in Settings, then run again.",
		detail,
	};
}

/** The sandbox's own build failed and nothing more specific is known; no quest code is involved yet. */
export function sandboxBuildFailed(detail: string): AppError
{
	return {
		code: "build-environment-failed",
		message: "The sandbox project could not be built. No quest code is involved yet, so this is about the setup on this computer.",
		suggestedAction: "Open the details to read the first error. A full disk, a missing Visual Studio or Xcode part, or an open Unreal editor are the usual causes. Fix that, then use Rebuild sandbox in Settings.",
		detail,
	};
}
