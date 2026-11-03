// Settings' Set up the sandbox again (M5.1k): when the button is off and why, when the sandbox looks missing, and the folder that held it.
import { describe, expect, it } from "vitest";

import type { EnvironmentStatus } from "@shared/types/engine";

import { parentFolderOf, sandboxLooksMissing, setupAgainBlocker } from "../../src/renderer/src/lib/sandboxSetupAgain";

/** An environment with a working engine and the sandbox state given. */
function environment(engineFound: boolean, sandboxReady: boolean): EnvironmentStatus
{
	return {
		engine: engineFound ? { version: "5.8.4", path: "C:\\Program Files\\Epic Games\\UE_5.8", source: "launcher", supportsFastLoop: true } : null,
		sandbox: { path: "C:\\Dojo\\DojoSandbox", ready: sandboxReady },
		reviewProvider: null,
		loopMode: "auto",
		editorConnected: false,
	};
}

describe("setupAgainBlocker", () =>
{
	it("lets a new sandbox be set up when the engine in Settings works, whether or not the old sandbox is there", () =>
	{
		expect(setupAgainBlocker(environment(true, false))).toBeNull();
		expect(setupAgainBlocker(environment(true, true))).toBeNull();
	});

	it("asks for a working engine first, since the new sandbox is built with it", () =>
	{
		expect(setupAgainBlocker(environment(false, false))).toContain("Pick a working engine above first");
	});

	it("keeps the button off while the environment has not answered", () =>
	{
		expect(setupAgainBlocker(undefined)).not.toBeNull();
	});
});

describe("sandboxLooksMissing", () =>
{
	it("is true only when Settings names a sandbox and the environment says it holds no built project", () =>
	{
		expect(sandboxLooksMissing({ sandboxPath: "C:\\Dojo\\DojoSandbox" }, environment(true, false))).toBe(true);
		expect(sandboxLooksMissing({ sandboxPath: "C:\\Dojo\\DojoSandbox" }, environment(true, true))).toBe(false);
		expect(sandboxLooksMissing({ sandboxPath: null }, environment(true, false))).toBe(false);
		expect(sandboxLooksMissing({ sandboxPath: "C:\\Dojo\\DojoSandbox" }, undefined)).toBe(false);
	});
});

describe("parentFolderOf", () =>
{
	it("gives the folder the learner picked at setup, with either slash style", () =>
	{
		expect(parentFolderOf("C:\\Users\\learner\\Dojo\\DojoSandbox")).toBe("C:\\Users\\learner\\Dojo");
		expect(parentFolderOf("/Users/learner/Dojo/DojoSandbox/")).toBe("/Users/learner/Dojo");
	});

	it("keeps a Windows drive root as C:\\ and the POSIX root as /, and has no parent for a bare name", () =>
	{
		expect(parentFolderOf("C:\\DojoSandbox")).toBe("C:\\");
		expect(parentFolderOf("/DojoSandbox")).toBe("/");
		expect(parentFolderOf("DojoSandbox")).toBeNull();
	});
});
