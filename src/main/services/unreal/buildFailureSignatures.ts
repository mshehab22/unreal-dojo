// Data: the build output lines that mean the build failed for a reason outside the learner's code, each with its ready plain-English error.
import type { AppError } from "@shared/types/errors";

import {
	diskFull,
	fileInUse,
	liveCodingBlocksBuild,
	pathTooLongForBuild,
	visualStudioNotUsableByBuild,
	xcodeNotUsableByBuild,
} from "./unrealErrors";

/** One known outside failure: a line pattern and the error to show when a build output line matches it. */
export interface BuildFailureSignature
{
	/** A short name for tests and logs. */
	name: string;

	/** Matches one line of build output. */
	pattern: RegExp;

	/** Makes the error from the raw matched line, which becomes its detail. */
	explain: (matchedLine: string) => AppError;
}

/** Known outside failures, most specific first. The explainer never matches them on a line that names a quest or test file, because the learner wrote that line's text (A1199). The Live Coding, Visual Studio, Windows SDK and Xcode strings were read in the UE 5.8.3 build tool source; the disk and file lock strings are the compilers' and the operating systems' own. */
export const BUILD_FAILURE_SIGNATURES: BuildFailureSignature[] = [
	// UnrealBuildTool, HotReload.cs: "Unable to build while Live Coding is active. Exit the editor and game, ..."
	{ name: "live-coding-active", pattern: /Unable to build while Live Coding is active/i, explain: liveCodingBlocksBuild },

	// MSVC LNK1180 and the system messages for a full disk; clang and the Unix tools say "No space left on device". The bare words "not enough space" are not enough: a learner can write them in a message.
	{ name: "disk-full", pattern: /not enough (?:space|room) on the disk|No space left on device|ERROR_DISK_FULL|LNK1180/i, explain: diskFull },

	// The linker cannot open a module DLL or PDB an open editor holds, or any tool names the lock.
	{ name: "file-locked", pattern: /LNK1104.*\.(dll|pdb|exp)\b|being used by another process|The process cannot access the file/i, explain: fileInUse },

	// MSVC C1081 and the system text for names over the Windows limit.
	{ name: "path-too-long", pattern: /fatal error C1081|file ?name too long|The filename or extension is too long|The specified path, file name, or both are too long/i, explain: pathTooLongForBuild },

	// UnrealBuildTool, MicrosoftPlatformSDK.cs: toolchain selection, banned or too-old MSVC, and the Windows SDK; the compiler cannot find the core Windows headers.
	{
		name: "visual-studio-or-sdk-missing",
		pattern: /Unable to find (?:requested Windows SDK|valid .* C\+\+ toolchain)|UnrealBuildTool (?:requires at minimum|has banned) the MSVC|No (?:suitable )?Visual Studio installation|Visual (?:Studio|C\+\+).{0,40}(?:was not found|not installed|could not be found)|Cannot open include file: '(?:windows|winnt|winsock2)\.h'/i,
		explain: visualStudioNotUsableByBuild,
	},

	// UnrealBuildTool, AppleToolChainSettings.cs: CommandLineTools selected, Xcode missing or too old; plus the xcrun and license messages Xcode prints.
	{
		name: "xcode-missing",
		pattern: /Your Mac is set to use CommandLineTools|Selected Xcode .* (?:doesn't|does not) exist|requires Xcode .* or newer|xcode-select: error|xcrun: error: (?:invalid active developer path|unable to find utility|SDK .* cannot be located)|You have not agreed to the Xcode license/i,
		explain: xcodeNotUsableByBuild,
	},
];
