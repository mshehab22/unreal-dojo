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

/** How long an answering editor that was asked to start Live Coding gets to report it ready. It takes 2 to 6 seconds after the server answers; past this the editor is used anyway and a compile answers "not enabled", which sends the run to the headless loop (A1072). */
export const LIVE_CODING_READY_TIMEOUT_MS = 60_000;

/** The editor log line that says Live Coding has started and loaded the project's module (`LogLiveCodingServer`, UE 5.8.3). */
const LIVE_CODING_READY_LINE = /Live coding ready/i;

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

	/** Start Live Coding, hidden, in a windowless editor (Windows only). An unattended editor never starts it, and CompileLiveCoding answers "not enabled", so this leaves out `-Unattended` and sets the Live Coding startup to hidden by `-ini` (A1072). Ignored for a windowed editor, which starts it from the learner's own editor settings. */
	startLiveCoding?: boolean;

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

	/** True when the launch asked for Live Coding, so a caller should wait for `isLiveCodingReady` before the first compile. */
	readonly startsLiveCoding: boolean;

	/** True once the editor log has said Live Coding is ready. Always false when the launch did not ask for it. */
	isLiveCodingReady(): boolean;
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
	private launchQueue: Promise<unknown> = Promise.resolve();
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
		const liveCoding = request.windowless && request.startLiveCoding === true;
		// Live Coding starts by itself only in an attended editor, and starts hidden only through its startup setting; the first compile still shows its console window (A1072).
		const windowlessArguments = request.windowless ? ["-NullRHI", ...(liveCoding ? [] : ["-Unattended"]), "-NoSplash", "-NoSound", "-stdout", "-FullStdOutLogOutput"] : [];
		const liveCodingArguments = liveCoding ? ["-ini:EditorPerProjectUserSettings:[/Script/LiveCoding.LiveCodingSettings]:bEnabled=True,[/Script/LiveCoding.LiveCodingSettings]:Startup=AutomaticButHidden"] : [];

		return [paths.pathArgument(request.projectFile), ...mcpArguments, ...windowlessArguments, ...liveCodingArguments];
	}

	/** Closes any editor already open, checks the MCP port is free, starts a new editor, and returns its session at once (the server answers some seconds later; see waitUntilAnswering). Throws `editor-launch-failed` when the port is taken or the app is quitting. Launches run one at a time, so a reopen after a full build and a learner's Open editor never leave a first editor running with no session to close it (A1075). */
	launch(request: EditorLaunchRequest): Promise<EditorSession>
	{
		const turn = this.launchQueue.then(() => this.launchNow(request));
		this.launchQueue = turn.catch(() => undefined);

		return turn;
	}

	/** One launch, started only when no other launch is in progress. */
	private async launchNow(request: EditorLaunchRequest): Promise<EditorSession>
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

		const startsLiveCoding = request.windowless && request.startLiveCoding === true;
		let liveCodingReady = false;
		const process = launcher.start({ command: paths.editorBinary(request.engineRoot), commandArguments: this.commandArguments(request), verbatimArguments: paths.verbatimArguments }, (line) =>
		{
			if (startsLiveCoding && LIVE_CODING_READY_LINE.test(line)) liveCodingReady = true;

			request.onLine?.(line);
		});
		const client = createClient(request.port);

		const entry: { value: EditorSession; process: RunningProcess; exited: boolean } = {
			process,
			exited: false,
			value: { engineRoot: request.engineRoot, projectFile: request.projectFile, port: request.port, launchedAt: timer.now(), client, isRunning: () => !entry.exited, startsLiveCoding, isLiveCodingReady: () => liveCodingReady },
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

	/** Asks the session's server until it answers, the editor exits, or the time runs out. When the launch asked for Live Coding it then also waits, up to a minute more, for the editor log to say Live Coding is ready (A1072). */
	async waitUntilAnswering(session: EditorSession, timeoutMs: number): Promise<boolean>
	{
		const timer = this.dependencies.timer;
		const deadline = timer.now() + timeoutMs;

		while (session.isRunning() && timer.now() < deadline)
		{
			if (await session.client.isAnswering())
			{
				await this.waitUntilLiveCodingReady(session);

				return true;
			}

			await new Promise<void>((resolve) => timer.schedule(resolve, READY_POLL_MS));
		}

		return false;
	}

	/** Waits for the Live Coding ready line, the editor exiting, or the time limit, whichever comes first. Does nothing when the launch did not ask for Live Coding. */
	private async waitUntilLiveCodingReady(session: EditorSession): Promise<void>
	{
		const timer = this.dependencies.timer;
		const deadline = timer.now() + LIVE_CODING_READY_TIMEOUT_MS;

		while (session.startsLiveCoding && !session.isLiveCodingReady() && session.isRunning() && timer.now() < deadline)
		{
			await new Promise<void>((resolve) => timer.schedule(resolve, READY_POLL_MS));
		}
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
