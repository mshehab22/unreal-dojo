// Opens the Unreal editor on the sandbox for the learner (the openEditor request) and answers whether it is connected.
import type { ToolchainCheck } from "@shared/types/engine";

import { AppErrorException } from "../../errors/AppErrorException";
import type { EditorLauncher } from "./EditorLauncher";
import type { FullBuildLedger } from "./FullBuildLedger";
import type { PlatformPaths } from "./PlatformPaths";
import { PROJECT_FILE_NAME, type EngineInspector } from "./SandboxProjectService";
import type { UnrealSettingsStore } from "./UnrealSettingsStore";

/** How long a starting editor gets to answer on MCP before openEditor gives up. A cold first start compiles shaders. */
export const EDITOR_READY_TIMEOUT_MS = 3 * 60 * 1000;

/** What the service is built from. */
export interface EditorServiceDependencies
{
	settings: UnrealSettingsStore;
	engineInspector: EngineInspector;
	editorLauncher: EditorLauncher;
	ledger: FullBuildLedger;
	paths: PlatformPaths;

	/** The platform toolchain check; a non-blocking problem (the missing Metal toolchain on the Mac) means the editor window cannot open. */
	checkToolchain: () => Promise<ToolchainCheck>;
}

/** Keeps one editor open on the sandbox in settings: reuses it when it is current and answering, restarts it when it is stale or on another sandbox. */
export class EditorService
{
	private readonly dependencies: EditorServiceDependencies;

	/** Takes everything it uses. */
	constructor(dependencies: EditorServiceDependencies)
	{
		this.dependencies = dependencies;
	}

	/** Opens the editor and, on 5.8 and later, waits until its MCP server answers. Throws `sandbox-not-ready`, the engine check's error, or `editor-launch-failed`. */
	async openEditor(): Promise<void>
	{
		const { settings, engineInspector, editorLauncher, ledger, paths } = this.dependencies;
		const engineRoot = settings.getEnginePath();
		const sandboxFolder = settings.getSandboxPath();

		if (engineRoot === null || sandboxFolder === null) throw new AppErrorException("sandbox-not-ready", "The sandbox project has not been set up yet.", "Finish first-run setup (pick the engine and create the sandbox), then open the editor.");

		const engine = await engineInspector.inspectFolder(engineRoot);
		const projectFile = paths.join(sandboxFolder, PROJECT_FILE_NAME);
		const current = editorLauncher.current();
		const lastBuildAt = ledger.lastFullBuildAt();
		const currentIsFresh = current !== null && paths.pathKey(current.projectFile) === paths.pathKey(projectFile) && (lastBuildAt === null || lastBuildAt <= current.launchedAt);

		if (currentIsFresh && (!engine.supportsFastLoop || (await current.client.isAnswering()))) return;

		const windowless = engine.supportsFastLoop && (await this.windowCannotOpen());
		const session = await editorLauncher.launch({ engineRoot, projectFile, port: settings.getMcpPort(), startMcpServer: engine.supportsFastLoop, windowless });

		if (!engine.supportsFastLoop) return;

		if (!(await editorLauncher.waitUntilAnswering(session, EDITOR_READY_TIMEOUT_MS)))
		{
			await editorLauncher.close();

			throw new AppErrorException("editor-launch-failed", "The Unreal editor started, but its MCP server did not answer within 3 minutes.", "Try Open editor again. If it keeps failing, run a full build from Settings, then open the editor.", `port ${settings.getMcpPort()}`);
		}
	}

	/** True when the editor this app opened answers on its MCP server. Never throws. */
	async isConnected(): Promise<boolean>
	{
		const session = this.dependencies.editorLauncher.current();

		return session !== null && (await session.client.isAnswering().catch(() => false));
	}

	/** True when the toolchain says the editor window would not open, so a windowless editor still serves the fast loop (A532). */
	private async windowCannotOpen(): Promise<boolean>
	{
		const toolchain = await this.dependencies.checkToolchain().catch(() => null);

		return toolchain !== null && toolchain.problems.some((problem) => !problem.blocksBuild);
	}
}
