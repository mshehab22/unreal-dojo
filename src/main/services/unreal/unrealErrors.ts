// Every plain-English error the engine locator and toolchain checks can raise, in one place so the wording stays consistent.
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
