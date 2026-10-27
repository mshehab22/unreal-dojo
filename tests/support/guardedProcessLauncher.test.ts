// Checks the integration suite's launch guard: it records launches, passes a windowless editor through, and refuses a windowed one before anything starts.
import { describe, expect, it } from "vitest";

import { FakeProcessLauncher } from "../unreal/FakeProcessLauncher";
import { GuardedProcessLauncher } from "./GuardedProcessLauncher";

const WINDOWS_EDITOR = "C:\\Program Files\\Epic Games\\UE_5.8\\Engine\\Binaries\\Win64\\UnrealEditor.exe";
const MAC_EDITOR = "/Users/learner/UE_5.8/Engine/Binaries/Mac/UnrealEditor.app/Contents/MacOS/UnrealEditor";

describe("GuardedProcessLauncher", () =>
{
	it("starts a windowless editor and records it", () =>
	{
		const processes = new FakeProcessLauncher([{ hangs: true }]);
		const guard = new GuardedProcessLauncher(processes);

		guard.start({ command: WINDOWS_EDITOR, commandArguments: ["Dojo.uproject", "-NullRHI", "-Unattended"], verbatimArguments: true }, () => undefined);

		expect(processes.specs).toHaveLength(1);
		expect(guard.editorLaunchLines()).toEqual([`${WINDOWS_EDITOR} Dojo.uproject -NullRHI -Unattended`]);
	});

	it("refuses a windowed editor on either platform, and starts nothing", () =>
	{
		const processes = new FakeProcessLauncher([{ hangs: true }]);
		const guard = new GuardedProcessLauncher(processes);

		expect(() => guard.start({ command: WINDOWS_EDITOR, commandArguments: ["Dojo.uproject"], verbatimArguments: true }, () => undefined)).toThrow(/windowed editor/);
		expect(() => guard.start({ command: MAC_EDITOR, commandArguments: ["Dojo.uproject", "-ModelContextProtocolStartServer"], verbatimArguments: false }, () => undefined)).toThrow(/windowed editor/);
		expect(processes.specs).toHaveLength(0);
	});

	it("lets builds and the console editor through, and lists only editors as editor launches", () =>
	{
		const processes = new FakeProcessLauncher([{ hangs: true }, { hangs: true }]);
		const guard = new GuardedProcessLauncher(processes);

		guard.start({ command: "C:\\UE\\Engine\\Binaries\\Win64\\UnrealEditor-Cmd.exe", commandArguments: ["Dojo.uproject", "-ExecCmds=Automation RunTests"], verbatimArguments: true }, () => undefined);
		guard.start({ command: "C:\\UE\\Engine\\Binaries\\DotNET\\UnrealBuildTool\\UnrealBuildTool.exe", commandArguments: ["DojoEditor"], verbatimArguments: true }, () => undefined);

		expect(processes.specs).toHaveLength(2);
		expect(guard.launches).toHaveLength(2);
		expect(guard.editorLaunchLines()).toEqual([]);
	});
});
