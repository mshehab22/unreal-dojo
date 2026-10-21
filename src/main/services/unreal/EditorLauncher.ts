// Opens the Unreal editor on the sandbox with its MCP server, remembers that one editor, and closes it cleanly.
import { AppErrorException } from "../../errors/AppErrorException";
import type { EditorToolClient } from "./EditorToolClient";
import type { PlatformPaths } from "./PlatformPaths";
import type { PortProbe } from "./PortProbe";
import type { ProcessLauncher, RunningProcess } from "./ProcessLauncher";
import type { Timer } from "./SupervisedProcess";

/** How long a closing editor gets after the exit request before it is killed. The Mac editor was seen hanging in shutdown after SIGTERM (problems.md). */
export const CLOSE_GRACE_MS = 15_000;

/** How often the launcher asks a starting editor whether its server answers. */
const READY_POLL_MS = 1_000;

/** How to open the editor. */
export interface EditorLaunchRequest
{
	engineRoot: string;

	/** Full path of `Dojo.uproject`. */
	projectFile: string;

	/** The `mcpPort` setting; the server listens here. */
	port: number;

	/** True on 5.8 and later, where the MCP server exists (D09). */
	startMcpServer: boolean;

	/** True for a windowless editor (`-NullRHI`), used by the integration test and where the Metal toolchain is missing. */
	windowless: boolean;

	/** Receives the editor's output lines (only a windowless editor prints its log to stdout). */
	onLine?: (line: string) => void;
}

/** The editor the app opened, while it runs. */
export interface EditorSession
{
	readonly engineRoot: string;
	readonly projectFile: string;
	readonly port: number;

	/** When the editor was started, on the launcher's clock. The Mac stale-editor rule compares builds against it (A45). */
	readonly launchedAt: number;

	/** The client for this editor's server. */
	readonly client: EditorToolClient;

	/** True until the editor process exits. */
	isRunning(): boolean;
}

/** What the launcher is built from. */
export interface EditorLauncherDependencies
{
	paths: PlatformPaths;
	launcher: ProcessLauncher;
	timer: Timer;

	/** Makes the client for a port (McpEditorClient in the app, a fake in tests). */
	createClient: (port: number) => EditorToolClient;

	/** Checks the MCP port before launch. Unreal's server does not fail on a taken port, so without this the client could talk to another editor (fix round 1). */
	portProbe: PortProbe;
}

/** Keeps at most one editor open. Launching again closes the old one first. Closing asks the editor to quit, then kills its tree after 15 seconds. After dispose (app quit) it never starts another. */
export class EditorLauncher
{
	private readonly dependencies: EditorLauncherDependencies;
	private session: { value: EditorSession; process: RunningProcess; exited: boolean } | null = null;
	private lastRequest: EditorLaunchRequest | null = null;
	private disposed = false;

	/** Takes the paths, process launcher, clock, and client maker. */
	constructor(dependencies: EditorLauncherDependencies)
	{
		this.dependencies = dependencies;
	}

	/** The running editor this app opened, or null when none is open. */
	current(): EditorSession | null
	{
		return this.session && !this.session.exited ? this.session.value : null;
	}

	/** The arguments the editor gets, exposed for tests and docs. */
	commandArguments(request: Omit<EditorLaunchRequest, "engineRoot" | "onLine">): string[]
	{
		const paths = this.dependencies.paths;
		const mcpArguments = request.startMcpServer ? ["-ModelContextProtocolStartServer", paths.optionArgument("ModelContextProtocolPort", String(request.port))] : [];
		const windowlessArguments = request.windowless ? ["-NullRHI", "-Unattended", "-NoSplash", "-NoSound", "-stdout", "-FullStdOutLogOutput"] : [];

		return [paths.pathArgument(request.projectFile), ...mcpArguments, ...windowlessArguments];
	}

	/** Closes any editor already open, checks the MCP port is free, starts a new editor, and returns its session at once (the server answers some seconds later; see waitUntilAnswering). Throws `editor-launch-failed` when the port is taken or the app is quitting. */
	async launch(request: EditorLaunchRequest): Promise<EditorSession>
	{
		this.refuseWhenDisposed();
		await this.close();

		this.lastRequest = request;

		const { paths, launcher, timer, createClient, portProbe } = this.dependencies;

		if (request.startMcpServer && (await portProbe.isInUse(request.port)))
		{
			throw new AppErrorException("editor-launch-failed", `Port ${request.port} is already in use, so the editor's MCP server cannot start there.`, "Close the other Unreal editor or program using it, or change the MCP port in Settings.", `127.0.0.1:${request.port} accepted a connection before launch`);
		}

		// Quit may have begun while the old editor closed or the port was checked.
		this.refuseWhenDisposed();

		const process = launcher.start({ command: paths.editorBinary(request.engineRoot), commandArguments: this.commandArguments(request), verbatimArguments: paths.verbatimArguments }, request.onLine ?? (() => undefined));
		const client = createClient(request.port);

		const entry: { value: EditorSession; process: RunningProcess; exited: boolean } = {
			process,
			exited: false,
			value: { engineRoot: request.engineRoot, projectFile: request.projectFile, port: request.port, launchedAt: timer.now(), client, isRunning: () => !entry.exited },
		};

		this.session = entry;

		void process.exited.then(() =>
		{
			entry.exited = true;
			void client.close();
		});

		return entry.value;
	}

	/** Opens the editor again the way it was last opened (after a full build closed it, or to restart a stale one). Null when it was never opened or the app is quitting. */
	async reopen(): Promise<EditorSession | null>
	{
		return this.lastRequest && !this.disposed ? this.launch(this.lastRequest) : null;
	}

	/** Closes the editor for good: no launch or reopen starts another afterwards. The app calls it before quitting. */
	async dispose(): Promise<void>
	{
		this.disposed = true;

		await this.close();
	}

	/** Asks the session's server until it answers, the editor exits, or the time runs out. */
	async waitUntilAnswering(session: EditorSession, timeoutMs: number): Promise<boolean>
	{
		const timer = this.dependencies.timer;
		const deadline = timer.now() + timeoutMs;

		while (session.isRunning() && timer.now() < deadline)
		{
			if (await session.client.isAnswering()) return true;

			await new Promise<void>((resolve) => timer.schedule(resolve, READY_POLL_MS));
		}

		return false;
	}

	/** Asks the open editor to quit, waits up to 15 seconds, then kills its process tree. Resolves when it is gone. Does nothing when none is open. */
	async close(): Promise<void>
	{
		const entry = this.session;
		this.session = null;

		if (!entry || entry.exited) return;

		entry.process.requestExit();

		const cancelKill = this.dependencies.timer.schedule(() => entry.process.killTree(), CLOSE_GRACE_MS);

		// Dropping the connection rejects a call in flight at once instead of waiting up to 10 minutes for it.
		void entry.value.client.close();

		// After a clean exit its helpers are left alone: the zen storage server it may have started is shared with other editors.
		await entry.process.exited;
		cancelKill();
	}

	/** Throws when the app is quitting. */
	private refuseWhenDisposed(): void
	{
		if (this.disposed) throw new AppErrorException("editor-launch-failed", "Unreal Dojo is closing, so it will not open the editor.", "Open Unreal Dojo again to use the editor.");
	}
}
