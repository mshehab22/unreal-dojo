// Checks the cmd.exe command line the engine smoke uses for Build.bat when the engine and the project live in folders with spaces.
import { describe, expect, it } from "vitest";

import { quoteForWindowsShell, windowsShellArguments } from "../../tools/qa/windowsCommandLine";

describe("windowsShellArguments", () =>
{
	it("quotes the spaced engine and project paths and wraps the whole line once more for /s", () =>
	{
		const buildScript = "C:\\Program Files\\Epic Games\\UE_5.8\\Engine\\Build\\BatchFiles\\Build.bat";
		const projectArgument = "-Project=C:\\Users\\Mo Shehab\\AppData\\Local\\Temp\\dojo engine smoke\\Dojo\\Dojo.uproject";

		const shellArguments = windowsShellArguments(buildScript, ["DojoEditor", "Win64", "Development", projectArgument, "-WaitMutex", "-Progress"]);

		expect(shellArguments).toEqual([
			"/d",
			"/s",
			"/c",
			"\"\"C:\\Program Files\\Epic Games\\UE_5.8\\Engine\\Build\\BatchFiles\\Build.bat\" \"DojoEditor\" \"Win64\" \"Development\" "
				+ "\"-Project=C:\\Users\\Mo Shehab\\AppData\\Local\\Temp\\dojo engine smoke\\Dojo\\Dojo.uproject\" \"-WaitMutex\" \"-Progress\"\"",
		]);
	});

	it("doubles a quote inside an argument so cmd.exe keeps it inside the same argument", () =>
	{
		expect(quoteForWindowsShell("say \"hi\"")).toBe("\"say \"\"hi\"\"\"");
	});
});
