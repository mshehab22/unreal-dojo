// Checks the Windows (vswhere) and macOS (Xcode) toolchain checks for every missing piece and the healthy case.
import { describe, expect, it } from "vitest";

import { MacToolchainChecker } from "../../src/main/services/unreal/MacToolchainChecker";
import { WindowsSdkFinder } from "../../src/main/services/unreal/WindowsSdkFinder";
import { WindowsToolchainChecker } from "../../src/main/services/unreal/WindowsToolchainChecker";
import { FakeCommandRunner } from "./FakeCommandRunner";
import { FakeFileSystemReader } from "./FakeFileSystemReader";

const VSWHERE = "C:\\Program Files (x86)\\Microsoft Visual Studio\\Installer\\vswhere.exe";
const WITH_WORKLOAD = `${VSWHERE} -products * -requires Microsoft.VisualStudio.Workload.NativeGame Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -format json -utf8`;
const ANY_INSTALL = `${VSWHERE} -products * -format json -utf8`;

/** The default Windows Kits include folder, where the finder looks when the registry has no root. */
const KITS_INCLUDE = "C:\\Program Files (x86)\\Windows Kits\\10\\Include";

/** An SDK search over a disk with these SDK versions, each with its Windows headers. */
function sdkFinderWith(versions: string[]): WindowsSdkFinder
{
	const folders: Record<string, string[]> = { [KITS_INCLUDE]: versions };

	for (const version of versions) folders[`${KITS_INCLUDE}\\${version}`] = ["shared", "ucrt", "um", "winrt"];

	return new WindowsSdkFinder(new FakeCommandRunner({}), new FakeFileSystemReader({}, folders), undefined);
}

/** A disk with the oldest accepted SDK and a newer one. */
const HEALTHY_SDKS = sdkFinderWith(["10.0.19041.0", "10.0.26100.0"]);

/** vswhere JSON for one install. */
function vswhereJson(displayName: string, installationVersion: string, productDisplayVersion: string): string
{
	return JSON.stringify([{ displayName, installationVersion, catalog: { productDisplayVersion } }]);
}

describe("WindowsToolchainChecker", () =>
{
	it("reports Visual Studio missing when vswhere is not installed", async () =>
	{
		const check = await new WindowsToolchainChecker(new FakeCommandRunner({}), undefined, HEALTHY_SDKS).check();

		expect(check.ok).toBe(false);
		expect(check.tool).toBe("vswhere");
		expect(check.message).toBe("Visual Studio is not installed. Unreal needs it to compile C++ on Windows.");
		expect(check.problems).toHaveLength(1);
		expect(check.problems[0]?.error.code).toBe("toolchain-missing");
		expect(check.problems[0]?.blocksBuild).toBe(true);
	});

	it("reports Visual Studio missing when vswhere finds no install at all", async () =>
	{
		const runner = new FakeCommandRunner({ [WITH_WORKLOAD]: { stdout: "[]" }, [ANY_INSTALL]: { stdout: "[]" } });
		const check = await new WindowsToolchainChecker(runner, undefined, HEALTHY_SDKS).check();

		expect(check.ok).toBe(false);
		expect(check.message).toMatch(/Visual Studio is not installed/);
	});

	it("reports the workload missing when Visual Studio is installed without it", async () =>
	{
		const runner = new FakeCommandRunner({ [WITH_WORKLOAD]: { stdout: "[]" }, [ANY_INSTALL]: { stdout: vswhereJson("Visual Studio Community 2026", "18.0.11205.157", "18.0.1") } });
		const check = await new WindowsToolchainChecker(runner, undefined, HEALTHY_SDKS).check();

		expect(check.ok).toBe(false);
		expect(check.message).toBe("Visual Studio Community 2026 is installed, but without the \"Game development with C++\" workload Unreal needs.");
		expect(check.suggestedAction).toMatch(/Visual Studio Installer/);
	});

	it("reports a Visual Studio 2022 older than 17.14", async () =>
	{
		const runner = new FakeCommandRunner({ [WITH_WORKLOAD]: { stdout: vswhereJson("Visual Studio Community 2022", "17.10.35013.160", "17.10.3") } });
		const check = await new WindowsToolchainChecker(runner, undefined, HEALTHY_SDKS).check();

		expect(check.ok).toBe(false);
		expect(check.toolVersion).toBe("17.10.3");
		expect(check.message).toMatch(/older than Unreal Engine 5\.8 accepts/);
	});

	it("passes with the workload on a new enough version, picking the newest install", async () =>
	{
		const twoInstalls = JSON.stringify([
			{ displayName: "Visual Studio Community 2022", installationVersion: "17.14.36301.6", catalog: { productDisplayVersion: "17.14.13" } },
			{ displayName: "Visual Studio Community 2026", installationVersion: "18.0.11205.157", catalog: { productDisplayVersion: "18.0.1" } },
		]);
		const runner = new FakeCommandRunner({ [`D:\\x86\\Microsoft Visual Studio\\Installer\\vswhere.exe -products * -requires ${WITH_WORKLOAD.split("-requires ")[1]}`]: { stdout: twoInstalls } });
		const check = await new WindowsToolchainChecker(runner, "D:\\x86", HEALTHY_SDKS).check();

		expect(check).toEqual({ ok: true, tool: "vswhere", message: "Visual Studio Community 2026 18.0.1 has the Game development with C++ workload, and Windows SDK 10.0.26100.0 is installed.", toolVersion: "18.0.1", problems: [] });
	});

	it("reports a missing Windows SDK with the installer step that fixes it (A1315)", async () =>
	{
		const runner = new FakeCommandRunner({ [WITH_WORKLOAD]: { stdout: vswhereJson("Visual Studio Community 2026", "18.0.11205.157", "18.0.1") } });
		const check = await new WindowsToolchainChecker(runner, undefined, sdkFinderWith([])).check();

		expect(check.ok).toBe(false);
		expect(check.message).toBe("No Windows SDK is installed. Unreal needs one (10.0.19041.0 or newer) to compile C++ on Windows.");
		expect(check.suggestedAction).toBe("Open the Visual Studio Installer, choose Modify, open Individual components, tick the newest Windows 11 SDK listed, and install.");
		expect(check.problems).toEqual([expect.objectContaining({ blocksBuild: true, error: expect.objectContaining({ code: "toolchain-missing" }) })]);
	});

	it("reports a Windows SDK older than UBT's minimum (10.0.19041.0), naming the newest one found", async () =>
	{
		const runner = new FakeCommandRunner({ [WITH_WORKLOAD]: { stdout: vswhereJson("Visual Studio Community 2026", "18.0.11205.157", "18.0.1") } });
		const check = await new WindowsToolchainChecker(runner, undefined, sdkFinderWith(["10.0.17763.0", "10.0.18362.0"])).check();

		expect(check.ok).toBe(false);
		expect(check.message).toBe("The newest Windows SDK on this computer is 10.0.18362.0, which is older than Unreal needs (10.0.19041.0 or newer).");
	});

	it("accepts UBT's minimum SDK, 10.0.19041.0, as the newest one", async () =>
	{
		const runner = new FakeCommandRunner({ [WITH_WORKLOAD]: { stdout: vswhereJson("Visual Studio Community 2026", "18.0.11205.157", "18.0.1") } });
		const check = await new WindowsToolchainChecker(runner, undefined, sdkFinderWith(["10.0.19041.0"])).check();

		expect(check).toMatchObject({ ok: true, problems: [], message: "Visual Studio Community 2026 18.0.1 has the Game development with C++ workload, and Windows SDK 10.0.19041.0 is installed." });
	});

	it("does not look for an SDK when Visual Studio itself is missing", async () =>
	{
		const check = await new WindowsToolchainChecker(new FakeCommandRunner({}), undefined, sdkFinderWith([])).check();

		expect(check.problems).toHaveLength(1);
		expect(check.message).toMatch(/Visual Studio is not installed/);
	});
});

describe("MacToolchainChecker", () =>
{
	const XCODE_FOLDER = { stdout: "/Applications/Xcode.app/Contents/Developer\n" };
	const XCODE_VERSION = { stdout: "Xcode 27.1\nBuild version 27A9275\n" };
	const METAL_MISSING = { exitCode: 1, stderr: "error: error: cannot execute tool 'metal' due to missing Metal Toolchain; use: xcodebuild -downloadComponent MetalToolchain" };

	it("reports Xcode not selected when xcode-select fails", async () =>
	{
		const runner = new FakeCommandRunner({ "xcode-select -p": { exitCode: 2, stderr: "xcode-select: error: unable to get active developer directory" } });
		const check = await new MacToolchainChecker(runner).check();

		expect(check.ok).toBe(false);
		expect(check.tool).toBe("xcode-select");
		expect(check.message).toBe("Xcode is not installed or not selected. Unreal needs it to compile C++ on a Mac.");
		expect(runner.commandLines).toEqual(["xcode-select -p"]);
	});

	it("reports Xcode not selected when xcode-select cannot start", async () =>
	{
		expect((await new MacToolchainChecker(new FakeCommandRunner({})).check()).ok).toBe(false);
	});

	it("reports when only the Command Line Tools are selected", async () =>
	{
		const runner = new FakeCommandRunner({ "xcode-select -p": { stdout: "/Library/Developer/CommandLineTools\n" } });
		const check = await new MacToolchainChecker(runner).check();

		expect(check.ok).toBe(false);
		expect(check.message).toMatch(/Command Line Tools/);
		expect(check.suggestedAction).toMatch(/sudo xcode-select -s/);
	});

	it("reports an unaccepted Xcode license", async () =>
	{
		const runner = new FakeCommandRunner({ "xcode-select -p": XCODE_FOLDER, "xcodebuild -version": { exitCode: 69, stderr: "You have not agreed to the Xcode license agreements." } });
		const check = await new MacToolchainChecker(runner).check();

		expect(check.ok).toBe(false);
		expect(check.suggestedAction).toBe("Run: sudo xcodebuild -license accept (or open Xcode once and agree).");
	});

	it("reports an Xcode that does not answer for another reason", async () =>
	{
		const runner = new FakeCommandRunner({ "xcode-select -p": XCODE_FOLDER, "xcodebuild -version": { exitCode: 1, stderr: "xcodebuild: error: something else" } });
		const check = await new MacToolchainChecker(runner).check();

		expect(check.ok).toBe(false);
		expect(check.problems[0]?.error.detail).toBe("xcodebuild: error: something else");
	});

	it("passes with a non-blocking problem when the Metal toolchain is missing (this Mac today)", async () =>
	{
		const runner = new FakeCommandRunner({ "xcode-select -p": XCODE_FOLDER, "xcodebuild -version": XCODE_VERSION, "xcrun metal --version": METAL_MISSING });
		const check = await new MacToolchainChecker(runner).check();

		expect(check.ok).toBe(true);
		expect(check.toolVersion).toBe("27.1");
		expect(check.problems).toHaveLength(1);
		expect(check.problems[0]?.blocksBuild).toBe(false);
		expect(check.message).toBe("Xcode 27.1 is selected (/Applications/Xcode.app/Contents/Developer). The Metal toolchain is not installed. Builds and tests work, but the Unreal editor window will not open.");
		expect(check.suggestedAction).toBe("Run once in Terminal: xcodebuild -downloadComponent MetalToolchain");
	});

	it("passes cleanly when everything is installed", async () =>
	{
		const runner = new FakeCommandRunner({ "xcode-select -p": XCODE_FOLDER, "xcodebuild -version": XCODE_VERSION, "xcrun metal --version": { stdout: "Apple metal version 32023.404" } });

		expect(await new MacToolchainChecker(runner).check()).toEqual({
			ok: true,
			tool: "xcode-select",
			message: "Xcode 27.1 is selected (/Applications/Xcode.app/Contents/Developer).",
			toolVersion: "27.1",
			problems: [],
		});
	});
});
