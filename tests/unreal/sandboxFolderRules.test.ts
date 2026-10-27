// Checks the sandbox folder rules on both platforms: each warning, the engine-folder blocker, case and separator handling, and a clean folder.
import { describe, expect, it } from "vitest";

import { MacPlatformPaths } from "../../src/main/services/unreal/MacPlatformPaths";
import { SandboxFolderRules } from "../../src/main/services/unreal/SandboxFolderRules";
import { WindowsPlatformPaths } from "../../src/main/services/unreal/WindowsPlatformPaths";

/** The rules over Windows paths. */
const windowsRules = new SandboxFolderRules(new WindowsPlatformPaths({}));

/** The rules over macOS paths. */
const macRules = new SandboxFolderRules(new MacPlatformPaths("/Users/learner"));

/** The sandbox folder inside a picked Windows folder, as the service builds it. */
function windowsSandboxOf(pickedFolder: string): string
{
	return `${pickedFolder}\\DojoSandbox`;
}

/** The warnings for a Windows folder. */
function windowsWarnings(pickedFolder: string): string[]
{
	return windowsRules.warnings(pickedFolder, windowsSandboxOf(pickedFolder));
}

/** The warnings for a Mac folder. */
function macWarnings(pickedFolder: string): string[]
{
	return macRules.warnings(pickedFolder, `${pickedFolder}/DojoSandbox`);
}

describe("SandboxFolderRules warnings", () =>
{
	it("says nothing about a short plain folder on either platform", () =>
	{
		expect(windowsWarnings("C:\\Dojo")).toEqual([]);
		expect(macWarnings("/Users/learner/Dojo")).toEqual([]);
	});

	it("warns about a Windows sandbox path over 100 characters, with its length, and never on a Mac", () =>
	{
		const longFolder = `C:\\Users\\learner\\${"Very Long Folder Name\\".repeat(4)}`;

		expect(windowsWarnings(longFolder)).toEqual([expect.stringMatching(/The sandbox path is \d+ characters long.*over 100.*C:\\Dojo/)]);
		expect(macWarnings(`/Users/learner/${"Very Long Folder Name/".repeat(4)}`)).toEqual([]);
	});

	it("warns about letters outside plain English on both platforms", () =>
	{
		expect(windowsWarnings("C:\\Users\\Zo\u00eb\\Dojo")).toEqual([expect.stringMatching(/other than plain English/)]);
		expect(windowsWarnings("C:\\Users\\\u0645\u062d\u0645\u062f\\Dojo")).toHaveLength(1);
		expect(macWarnings("/Users/jos\u00e9/Dojo")).toEqual([expect.stringMatching(/other than plain English.*home folder/)]);
	});

	it("warns about each cloud sync folder by name", () =>
	{
		expect(windowsWarnings("C:\\Users\\learner\\OneDrive\\Dojo")).toEqual([expect.stringContaining("synced by OneDrive")]);
		expect(windowsWarnings("C:\\Users\\learner\\OneDrive - Personal\\Documents\\Dojo")).toEqual([expect.stringContaining("synced by OneDrive")]);
		expect(windowsWarnings("C:\\Users\\learner\\Dropbox\\Dojo")).toEqual([expect.stringContaining("synced by Dropbox")]);
		expect(windowsWarnings("G:\\Google Drive\\Dojo")).toEqual([expect.stringContaining("synced by Google Drive")]);
		expect(windowsWarnings("C:\\Users\\learner\\iCloudDrive\\Dojo")).toEqual([expect.stringContaining("synced by iCloud Drive")]);
		expect(windowsWarnings("C:\\Users\\learner\\iCloud Drive\\Dojo")).toEqual([expect.stringContaining("synced by iCloud Drive")]);
		expect(macWarnings("/Users/learner/Library/Mobile Documents/com~apple~CloudDocs/Dojo")).toEqual([expect.stringContaining("synced by iCloud Drive")]);
		expect(macWarnings("/Users/learner/Library/CloudStorage/Dropbox/Dojo")).toEqual([expect.stringContaining("synced by Dropbox")]);
		expect(macWarnings("/Users/learner/Library/CloudStorage/OneDrive-Personal/Dojo")).toEqual([expect.stringContaining("synced by OneDrive")]);
	});

	it("matches a cloud folder by whole name only", () =>
	{
		expect(windowsWarnings("C:\\Users\\learner\\OneDriveStuff\\Dojo")).toEqual([]);
		expect(windowsWarnings("C:\\Users\\learner\\MyDropboxNotes\\Dojo")).toEqual([]);
	});

	it("warns about a Windows network path in either slash style, but not about the local long-path prefix", () =>
	{
		expect(windowsWarnings("\\\\server\\share\\Dojo")).toEqual([expect.stringContaining("network location")]);
		expect(windowsWarnings("//server/share/Dojo")).toEqual([expect.stringContaining("network location")]);
		expect(windowsWarnings("\\\\?\\UNC\\server\\share\\Dojo")).toEqual([expect.stringContaining("network location")]);
		expect(windowsWarnings("\\\\?\\C:\\Dojo")).toEqual([]);
		expect(macWarnings("//server/share/Dojo")).toEqual([]);
	});

	it("warns about Program Files and Program Files (x86), in any letter case, on Windows only", () =>
	{
		expect(windowsWarnings("C:\\Program Files\\Dojo")).toEqual([expect.stringContaining("Program Files")]);
		expect(windowsWarnings("c:\\PROGRAM FILES (x86)\\Dojo")).toEqual([expect.stringContaining("Program Files")]);
		expect(windowsWarnings("C:\\Program Files Extra\\Dojo")).toEqual([]);
		expect(macWarnings("/Program Files/Dojo")).toEqual([]);
	});

	it("lists several warnings together, one sentence each", () =>
	{
		const warnings = windowsWarnings("C:\\Users\\Zo\u00eb\\OneDrive\\Unreal Projects\\Practice\\A Very Long Folder Name For Learning\\Dojo Sandbox");

		expect(warnings).toHaveLength(3);
		expect(warnings.join(" ")).toMatch(/characters long.*other than plain English.*OneDrive/);
	});

	it("warns that the machine fixture's own Windows folder is synced by OneDrive", () =>
	{
		const warnings = windowsWarnings("C:\\Users\\learner\\OneDrive - Personal\\Documents\\Unreal Projects\\Practice\\UnrealDojo");

		expect(warnings.some((warning) => warning.includes("synced by OneDrive"))).toBe(true);
	});

	it("warns about Google Drive for desktop on Windows, where My Drive or Shared drives sits right under a drive letter", () =>
	{
		expect(windowsWarnings("G:\\My Drive\\Dojo")).toEqual([expect.stringContaining("synced by Google Drive")]);
		expect(windowsWarnings("h:\\SHARED DRIVES\\Team\\Dojo")).toEqual([expect.stringContaining("synced by Google Drive")]);
		expect(windowsWarnings("C:\\Dojo\\My Drive")).toEqual([]);
		expect(windowsWarnings("C:\\Users\\learner\\My Drive\\Dojo")).toEqual([]);
		expect(macWarnings("/My Drive/Dojo")).toEqual([]);
	});

	it("treats any folder under Library/CloudStorage on a Mac as cloud-synced, and Library/CloudStorage itself as not", () =>
	{
		expect(macWarnings("/Users/learner/Library/CloudStorage/Box-Box/Dojo")).toEqual([expect.stringContaining("synced by a cloud storage service")]);
		expect(macWarnings("/Users/learner/Library/CloudStorage/GoogleDrive-me@example.com/My Drive/Dojo")).toEqual([expect.stringContaining("synced by Google Drive")]);
		expect(macWarnings("/Users/learner/Library/CloudStorage")).toEqual([]);
	});
});

describe("SandboxFolderRules blockers", () =>
{
	it("blocks the engine folder itself and anything inside it on a Mac", () =>
	{
		expect(macRules.blockers("/Users/Shared/Epic Games/UE_5.8", "/Users/Shared/Epic Games/UE_5.8")).toEqual([expect.stringContaining("inside your Unreal Engine install")]);
		expect(macRules.blockers("/Users/Shared/Epic Games/UE_5.8/Projects/Dojo", "/Users/Shared/Epic Games/UE_5.8")).toHaveLength(1);
	});

	it("compares Windows folders without regard to letter case, slash style, or a trailing slash", () =>
	{
		const engine = "C:\\Program Files\\Epic Games\\UE_5.8";

		expect(windowsRules.blockers("c:\\program files\\epic games\\ue_5.8\\Projects", engine)).toHaveLength(1);
		expect(windowsRules.blockers("C:/Program Files/Epic Games/UE_5.8/", engine)).toHaveLength(1);
		expect(windowsRules.blockers("C:\\Program Files\\Epic Games\\UE_5.8\\", "c:/program files/epic games/ue_5.8")).toHaveLength(1);
	});

	it("keeps letter case exact on a Mac", () =>
	{
		expect(macRules.blockers("/engines/ue", "/Engines/UE")).toEqual([]);
	});

	it("allows a sibling with a similar name, a parent of the engine, and an unknown engine", () =>
	{
		expect(windowsRules.blockers("C:\\Program Files\\Epic Games\\UE_5.8.1", "C:\\Program Files\\Epic Games\\UE_5.8")).toEqual([]);
		expect(windowsRules.blockers("D:\\Dojo", "C:\\Program Files\\Epic Games\\UE_5.8")).toEqual([]);
		expect(windowsRules.blockers("C:\\Program Files\\Epic Games", "C:\\Program Files\\Epic Games\\UE_5.8")).toEqual([]);
		expect(macRules.blockers("/Users/learner/Dojo", null)).toEqual([]);
	});
});
