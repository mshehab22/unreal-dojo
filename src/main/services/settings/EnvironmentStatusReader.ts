// Answers the Title screen chips and the Settings screen in one call: engine, sandbox, review provider, loop mode, editor connection, and the friendly-failure parts.
import { join } from "node:path";

import type { EngineInstall, EnvironmentStatus, ToolchainCheck } from "@shared/types/engine";
import type { AppError } from "@shared/types/errors";
import type { ReviewProviderId, ReviewProviderStatus } from "@shared/types/review";
import type { ReviewProviderSetting, Settings } from "@shared/types/settings";

import type { LoadRecoveryReport } from "../progress/ProgressStore";
import { buildEngineProblem } from "./buildEngineProblem";
import { buildSaveNotice } from "./buildSaveNotice";

/** The provider order `auto` follows (D11); tests-only is the fallback, not a pick. */
const AUTO_ORDER: readonly ReviewProviderId[] = ["claude-code", "anthropic-api"];

/** The project file a sandbox folder holds. */
const SANDBOX_PROJECT_FILE = "Dojo.uproject";

/** The folder the first full build writes; its presence means the sandbox has been built at least once. */
const SANDBOX_BUILD_FOLDER = "Binaries";

/** What the reader looks at. Each source is a function so a failing one (a missing engine) only blanks its own chip. */
export interface EnvironmentSources
{
	/** The current settings. */
	currentSettings: () => Settings;

	/** Reads an engine folder; throws when it is not a supported engine. */
	inspectEngine: (folder: string) => Promise<EngineInstall>;

	/** Tells whether a file or folder exists. */
	pathExists: (path: string) => Promise<boolean>;

	/** Every review provider's status (the review service's cached checks). */
	reviewStatuses: () => Promise<ReviewProviderStatus[]>;

	/** True when the editor's MCP server answers on the sandbox project. False until the fast loop (M1.4) can ask. */
	editorConnected: () => Promise<boolean>;

	/** Runs the platform toolchain check (vswhere or xcode-select). The reader calls it once per session and on `refreshToolchain` (A1210). */
	checkToolchain: () => Promise<ToolchainCheck>;

	/** Why the save was refused, or null when it is open. */
	saveRefusal: () => AppError | null;

	/** How the save loaded at startup. */
	saveLoadRecovery: () => LoadRecoveryReport;
}

/** What reading the engine found: the install, or the reason it cannot be used. */
interface EngineReading
{
	engine: EngineInstall | null;
	problem: AppError | null;
}

/** Returns the provider status a review would use now: the chosen one, or the first available in `auto` order; null when only tests-only is left. */
export function resolveReviewProvider(choice: ReviewProviderSetting, statuses: readonly ReviewProviderStatus[]): ReviewProviderStatus | null
{
	const statusOf = (id: ReviewProviderId) => statuses.find((status) => status.id === id);

	if (choice === "tests-only") return statusOf("tests-only") ?? { id: "tests-only", available: true };

	const candidates = choice === "auto" ? AUTO_ORDER : [choice];

	for (const id of candidates)
	{
		const status = statusOf(id);
		if (status?.available) return status;
	}

	return null;
}

/** Builds the environment status. Never throws: a source that fails reports as missing or unavailable. */
export class EnvironmentStatusReader
{
	/** The toolchain check of this session, started at startup by `index.ts` through `refreshToolchain` (or by the first read if that did not happen) and kept so repeat reads never spawn the tool again. A read may wait for it while it runs. Null until it starts. */
	private toolchainCheck: Promise<ToolchainCheck | null> | null = null;

	/** The save notice, built on the first read. Undefined until then; null when the save loaded cleanly. */
	private saveNotice: AppError | null | undefined = undefined;

	/** Keeps the sources. */
	constructor(private readonly sources: EnvironmentSources)
	{
	}

	/** Reads every part at once. */
	async read(): Promise<EnvironmentStatus>
	{
		const settings = this.sources.currentSettings();

		const [engineReading, sandboxReady, reviewProvider, editorConnected, toolchain] = await Promise.all([
			this.readEngine(settings.enginePath),
			this.isSandboxBuilt(settings.sandboxPath),
			this.readReviewProvider(settings.reviewProvider),
			this.sources.editorConnected().catch(() => false),
			this.readToolchain(),
		]);

		return {
			engine: engineReading.engine,
			sandbox: { path: settings.sandboxPath, ready: sandboxReady },
			reviewProvider,
			loopMode: settings.loopMode,
			editorConnected,
			engineProblem: engineReading.problem,
			toolchain,
			saveNotice: this.readSaveNotice(),
		};
	}

	/** Runs the toolchain check again and keeps its answer for later reads. Used by "Check again" and after a failure outside the learner's code (A1210). */
	refreshToolchain(): Promise<ToolchainCheck>
	{
		const check = this.startToolchainCheck();
		this.toolchainCheck = check.catch(() => null);

		return check;
	}

	/** The engine in settings, or null with the reason when none can be used. No engine set is no problem. */
	private async readEngine(enginePath: string | null): Promise<EngineReading>
	{
		if (enginePath === null) return { engine: null, problem: null };

		try
		{
			return { engine: await this.sources.inspectEngine(enginePath), problem: null };
		}
		catch (failure)
		{
			return { engine: null, problem: buildEngineProblem(enginePath, failure) };
		}
	}

	/** The toolchain check of this session; the first call starts it, and a read that comes while it runs waits for it. Null when the check itself could not run. */
	private readToolchain(): Promise<ToolchainCheck | null>
	{
		if (this.toolchainCheck === null)
		{
			this.toolchainCheck = this.startToolchainCheck().catch(() => null);
		}

		return this.toolchainCheck;
	}

	/** Starts the check. A source that throws before it returns a promise becomes a rejected promise, so the error never escapes a caller. */
	private startToolchainCheck(): Promise<ToolchainCheck>
	{
		return Promise.resolve().then(() => this.sources.checkToolchain());
	}

	/** The notice about the save file, built on the first read and kept: every read of the session returns it, and the screen decides when it was dismissed (A1192). */
	private readSaveNotice(): AppError | null
	{
		if (this.saveNotice === undefined)
		{
			this.saveNotice = buildSaveNotice(this.sources.saveRefusal(), this.sources.saveLoadRecovery());
		}

		return this.saveNotice;
	}

	/** True when the sandbox folder holds `Dojo.uproject` and has been built (`Binaries` exists). */
	private async isSandboxBuilt(sandboxPath: string | null): Promise<boolean>
	{
		if (sandboxPath === null) return false;

		const [hasProject, hasBuild] = await Promise.all([
			this.sources.pathExists(join(sandboxPath, SANDBOX_PROJECT_FILE)),
			this.sources.pathExists(join(sandboxPath, SANDBOX_BUILD_FOLDER)),
		]);

		return hasProject && hasBuild;
	}

	/** The provider a review would use now, or null when the statuses cannot be read. */
	private async readReviewProvider(choice: ReviewProviderSetting): Promise<ReviewProviderStatus | null>
	{
		try
		{
			return resolveReviewProvider(choice, await this.sources.reviewStatuses());
		}
		catch
		{
			return null;
		}
	}
}
