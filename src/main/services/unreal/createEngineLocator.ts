// Builds the real EngineLocator for the running machine, wired to the real disk and processes.
import { homedir } from "node:os";

import { AppErrorException } from "../../errors/AppErrorException";
import { createUnrealPlatform } from "./createUnrealPlatform";
import { EngineLocator } from "./EngineLocator";
import { NodeCommandRunner } from "./NodeCommandRunner";
import { NodeFileSystemReader } from "./NodeFileSystemReader";
import { platformUnsupported } from "./unrealErrors";

/** Returns an EngineLocator for this machine. Throws `toolchain-missing` with a plain explanation on an operating system other than Windows or macOS. */
export function createEngineLocator(): EngineLocator
{
	const platform = createUnrealPlatform({ platform: process.platform, homeFolder: homedir(), environment: process.env, commandRunner: new NodeCommandRunner() });

	if (!platform)
	{
		const error = platformUnsupported(process.platform);

		throw new AppErrorException(error.code, error.message, error.suggestedAction, error.detail);
	}

	return new EngineLocator({ ...platform, fileSystem: new NodeFileSystemReader() });
}
