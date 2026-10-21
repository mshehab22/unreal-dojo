// Checks that the registry reader parses `reg query` output for launcher installs and source builds.
import { describe, expect, it } from "vitest";

import { WindowsEngineRegistry } from "../../src/main/services/unreal/WindowsEngineRegistry";
import { FakeCommandRunner } from "./FakeCommandRunner";

const LAUNCHER_QUERY = "reg query HKLM\\SOFTWARE\\EpicGames\\Unreal Engine /s /v InstalledDirectory";
const SOURCE_QUERY = "reg query HKCU\\Software\\Epic Games\\Unreal Engine\\Builds";

/** What `reg query ... /s /v InstalledDirectory` prints for two launcher installs. */
const LAUNCHER_OUTPUT = [
	"",
	"HKEY_LOCAL_MACHINE\\SOFTWARE\\EpicGames\\Unreal Engine\\5.6",
	"    InstalledDirectory    REG_SZ    C:\\Program Files\\Epic Games\\UE_5.6",
	"",
	"HKEY_LOCAL_MACHINE\\SOFTWARE\\EpicGames\\Unreal Engine\\5.8",
	"    InstalledDirectory    REG_SZ    D:\\Epic Games\\UE_5.8",
	"",
	"End of search: 2 match(es) found.",
	"",
].join("\r\n");

/** What `reg query` prints for the source-build key. */
const SOURCE_OUTPUT = ["", "HKEY_CURRENT_USER\\Software\\Epic Games\\Unreal Engine\\Builds", "    {A1B2C3D4-0000-1111-2222-333344445555}    REG_SZ    D:/Source/UnrealEngine", ""].join("\r\n");

describe("WindowsEngineRegistry", () =>
{
	it("returns launcher folders, then source builds", async () =>
	{
		const runner = new FakeCommandRunner({ [LAUNCHER_QUERY]: { stdout: LAUNCHER_OUTPUT }, [SOURCE_QUERY]: { stdout: SOURCE_OUTPUT } });

		expect(await new WindowsEngineRegistry(runner).engineFolders()).toEqual(["C:\\Program Files\\Epic Games\\UE_5.6", "D:\\Epic Games\\UE_5.8", "D:/Source/UnrealEngine"]);
	});

	it("answers an empty list when the keys are missing (reg exits with 1)", async () =>
	{
		const runner = new FakeCommandRunner({ [LAUNCHER_QUERY]: { exitCode: 1, stderr: "ERROR: The system was unable to find the specified registry key or value." }, [SOURCE_QUERY]: { exitCode: 1 } });

		expect(await new WindowsEngineRegistry(runner).engineFolders()).toEqual([]);
	});

	it("answers an empty list when reg cannot be started", async () =>
	{
		expect(await new WindowsEngineRegistry(new FakeCommandRunner({})).engineFolders()).toEqual([]);
	});
});
