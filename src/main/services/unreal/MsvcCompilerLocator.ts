// Finds the MSVC compiler (cl.exe) for the Windows snippet check: the one UBT built the sandbox with, else Visual Studio's default (A1311).
import { win32 } from "node:path";

import type { CommandRunner } from "./CommandRunner";
import type { SandboxFileSystem } from "./SandboxFileSystem";
import { vswhereLocation } from "./vswhereLocation";

/** The MSVC x64 compiler component vswhere is asked for. */
const COMPILER_COMPONENT = "Microsoft.VisualStudio.Component.VC.Tools.x86.x64";

/** An include line in UBT's response file naming one MSVC tools folder, `.../VC/Tools/MSVC/14.50.35717/INCLUDE`. */
const MSVC_INCLUDE_LINE = /^\/(?:external:)?I\s*"([^"]*[\\/]VC[\\/]Tools[\\/]MSVC[\\/][^\\/"]+)[\\/]include"\s*$/i;

/** Finds `cl.exe`. Never throws; answers null when no compiler is installed. */
export class MsvcCompilerLocator
{
	private readonly commandRunner: CommandRunner;
	private readonly fileSystem: SandboxFileSystem;
	private readonly vswherePath: string;

	/** Takes the runner for vswhere, the file system, and `%ProgramFiles(x86)%`, where the Visual Studio Installer keeps vswhere. */
	constructor(commandRunner: CommandRunner, fileSystem: SandboxFileSystem, programFilesX86: string | undefined)
	{
		this.commandRunner = commandRunner;
		this.fileSystem = fileSystem;
		this.vswherePath = vswhereLocation(programFilesX86);
	}

	/**
	 * The compiler whose MSVC include folder UBT's shared response file names, because only that version can read the
	 * sandbox's precompiled header (UBT picks its own preferred version, not Visual Studio's default). When that folder
	 * is gone, the default MSVC tools of the newest Visual Studio with the C++ compiler, found through vswhere.
	 */
	async find(sharedResponseFile: string): Promise<string | null>
	{
		for (const line of sharedResponseFile.split(/\r?\n/))
		{
			const toolsFolder = MSVC_INCLUDE_LINE.exec(line.trim())?.[1];
			if (!toolsFolder) continue;

			const compiler = compilerIn(win32.normalize(toolsFolder));
			if (await this.exists(compiler)) return compiler;
		}

		return this.defaultCompiler();
	}

	/** The newest Visual Studio's default MSVC tools, from vswhere and `Microsoft.VCToolsVersion.default.txt`. */
	private async defaultCompiler(): Promise<string | null>
	{
		const result = await this.commandRunner.run(this.vswherePath, ["-latest", "-products", "*", "-requires", COMPILER_COMPONENT, "-property", "installationPath", "-utf8"]);
		if (!result.started || result.exitCode !== 0) return null;

		const installFolder = result.stdout.split(/\r?\n/).map((line) => line.trim()).find((line) => line !== "");
		if (!installFolder) return null;

		const version = (await this.fileSystem.readTextFile(win32.join(installFolder, "VC", "Auxiliary", "Build", "Microsoft.VCToolsVersion.default.txt")))?.trim();
		if (!version) return null;

		const compiler = compilerIn(win32.join(installFolder, "VC", "Tools", "MSVC", version));

		return (await this.exists(compiler)) ? compiler : null;
	}

	/** True when the file is in its folder's listing (the file system has no single-file check). */
	private async exists(filePath: string): Promise<boolean>
	{
		const fileName = win32.basename(filePath).toLowerCase();

		return (await this.fileSystem.listFiles(win32.dirname(filePath))).some((name) => name.toLowerCase() === fileName);
	}
}

/** The x64-hosted x64 compiler inside one MSVC tools folder. */
function compilerIn(toolsFolder: string): string
{
	return win32.join(toolsFolder, "bin", "Hostx64", "x64", "cl.exe");
}
