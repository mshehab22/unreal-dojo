// Checks the Windows SDK search: the Windows Kits root from `reg query` (64-bit view, then 32-bit), the default folder, and which version folders count (A1315).
import { describe, expect, it } from "vitest";

import { WindowsSdkFinder } from "../../src/main/services/unreal/WindowsSdkFinder";
import { FakeCommandRunner } from "./FakeCommandRunner";
import { FakeFileSystemReader } from "./FakeFileSystemReader";

const ROOTS_QUERY = "reg query HKLM\\SOFTWARE\\Microsoft\\Windows Kits\\Installed Roots /v KitsRoot10";

/** What `reg query ... /v KitsRoot10` printed on the Windows desktop (the root ends with a backslash). */
function rootsOutput(root: string): string
{
	return ["", "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows Kits\\Installed Roots", `    KitsRoot10    REG_SZ    ${root}`, "", ""].join("\r\n");
}

/** Folder listings for an SDK root with these versions, each with its Windows headers. */
function sdkFolders(root: string, versions: string[]): Record<string, string[]>
{
	const folders: Record<string, string[]> = { [`${root}\\Include`]: versions };

	for (const version of versions) folders[`${root}\\Include\\${version}`] = ["cppwinrt", "shared", "ucrt", "um", "winrt"];

	return folders;
}

describe("WindowsSdkFinder", () =>
{
	it("answers the newest version under the registry's root, as on the Windows desktop", async () =>
	{
		const runner = new FakeCommandRunner({ [ROOTS_QUERY]: { stdout: rootsOutput("C:\\Program Files (x86)\\Windows Kits\\10\\") } });
		const reader = new FakeFileSystemReader({}, sdkFolders("C:\\Program Files (x86)\\Windows Kits\\10", ["10.0.19041.0", "10.0.22621.0", "10.0.26100.0"]));

		expect(await new WindowsSdkFinder(runner, reader, undefined).newestVersion()).toBe("10.0.26100.0");
		expect(runner.commandLines).toEqual([ROOTS_QUERY]);
	});

	it("reads the 32-bit view when the 64-bit view has no root, and still looks in the default folder", async () =>
	{
		const runner = new FakeCommandRunner({ [ROOTS_QUERY]: { exitCode: 1 }, [`${ROOTS_QUERY} /reg:32`]: { stdout: rootsOutput("D:\\Kits\\10\\") } });
		const reader = new FakeFileSystemReader({}, { ...sdkFolders("D:\\Kits\\10", ["10.0.22621.0"]), ...sdkFolders("E:\\x86\\Windows Kits\\10", ["10.0.26100.0"]) });

		expect(await new WindowsSdkFinder(runner, reader, "E:\\x86").newestVersion()).toBe("10.0.26100.0");
		expect(runner.commandLines).toEqual([ROOTS_QUERY, `${ROOTS_QUERY} /reg:32`]);
	});

	it("skips version folders without Windows headers and names that are not versions", async () =>
	{
		const include = "C:\\Program Files (x86)\\Windows Kits\\10\\Include";
		const reader = new FakeFileSystemReader({}, { [include]: ["10.0.22621.0", "10.0.26100.0", "wdf"], [`${include}\\10.0.22621.0`]: ["shared", "ucrt", "um"], [`${include}\\10.0.26100.0`]: ["ucrt"] });

		expect(await new WindowsSdkFinder(new FakeCommandRunner({}), reader, undefined).newestVersion()).toBe("10.0.22621.0");
	});

	it("answers null when no SDK is installed", async () =>
	{
		expect(await new WindowsSdkFinder(new FakeCommandRunner({}), new FakeFileSystemReader({}), undefined).newestVersion()).toBeNull();
	});
});
