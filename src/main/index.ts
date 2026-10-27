// App lifecycle and composition root: builds services, registers IPC, and opens the window.
import { randomUUID } from "node:crypto";
import { renameSync } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";

import { app, BrowserWindow, dialog, ipcMain, safeStorage } from "electron";

import { createContentCatalog } from "./content/createContentCatalog";
import { resolveContentRoot } from "./content/resolveContentRoot";
import { createHandlers } from "./ipc/createHandlers";
import { holdQuitForSaves } from "./lifecycle/holdQuitForSaves";
import { reloadOnceOnRendererCrash } from "./lifecycle/reloadOnceOnRendererCrash";
import { showStartupFailure } from "./lifecycle/showStartupFailure";
import { registerHandlers } from "./ipc/registerHandlers";
import { sendBuildProgress } from "./ipc/sendBuildProgress";
import { createEngineLocator } from "./services/unreal/createEngineLocator";
import { createUnrealServices, type UnrealServices } from "./services/unreal/createUnrealServices";
import { SettingsServiceUnrealSettings } from "./services/unreal/SettingsServiceUnrealSettings";
import type { EngineLocator } from "./services/unreal/EngineLocator";
import { MathRandomSource } from "./services/progress/MathRandomSource";
import { NodeFileSystem } from "./services/progress/NodeFileSystem";
import { ProgressContentService } from "./services/progress/ProgressContentService";
import type { ProgressGraders } from "./services/progress/ProgressGraders";
import { ProgressService } from "./services/progress/ProgressService";
import { ProgressStore } from "./services/progress/ProgressStore";
import { SystemClock } from "./services/progress/SystemClock";
import { createReviewHandlers, type ReviewHandlers } from "./services/review/createReviewHandlers";
import { createReviewService, type ReviewService } from "./services/review/ReviewService";
import { SafeStorageReviewSettings } from "./services/review/settings/SafeStorageReviewSettings";
import { ElectronSettingsStore } from "./services/settings/ElectronSettingsStore";
import { EnvironmentStatusReader } from "./services/settings/EnvironmentStatusReader";
import { openSettingsStore } from "./services/settings/openSettingsStore";
import { SettingsService } from "./services/settings/SettingsService";
import { RunRegistry } from "./services/unreal/RunRegistry";
import { stopEngineWorkBeforeQuit } from "./services/unreal/stopEngineWorkBeforeQuit";
import { createMainWindow } from "./window/createMainWindow";
import { keepTestRunOffDesktop } from "./window/keepTestRunOffDesktop";
import { isHiddenTestWindow } from "./window/testWindowMode";

/** Opens the native folder picker over the focused window. Resolves null when the learner cancels. */
async function pickFolder(title: string): Promise<string | null>
{
	const options: Electron.OpenDialogOptions = { title, properties: ["openDirectory"] };
	const parentWindow = BrowserWindow.getFocusedWindow();
	const result = parentWindow ? await dialog.showOpenDialog(parentWindow, options) : await dialog.showOpenDialog(options);

	return result.canceled ? null : (result.filePaths[0] ?? null);
}

/** Tells whether a file or folder exists. */
async function pathExists(path: string): Promise<boolean>
{
	try
	{
		await access(path);
		return true;
	}
	catch
	{
		return false;
	}
}

/** Starts the app once Electron is ready and reopens the window when the macOS dock icon is clicked. */
async function start(): Promise<void>
{
	// Before anything else, so a hidden e2e run never shows a Dock icon, takes the menu bar, or switches apps on macOS, not even while starting (A970, A972).
	if (isHiddenTestWindow(process.env, app.isPackaged)) keepTestRunOffDesktop();

	await app.whenReady();

	let engineLocator: EngineLocator | null = null;
	const getEngineLocator = (): EngineLocator => (engineLocator ??= createEngineLocator());

	// A corrupt config.json is set aside instead of stopping the app (A429).
	const settingsStore = openSettingsStore({
		open: () => new ElectronSettingsStore(),
		configPath: join(app.getPath("userData"), "config.json"),
		renameFile: renameSync,
		now: () => new Date(),
		warn: (message) => console.warn(message),
	});
	const settingsService = new SettingsService(settingsStore, safeStorage, {
		inspectEngine: (folder) => getEngineLocator().inspectFolder(folder),
		isSandboxProject: (folder) => pathExists(join(folder, "Dojo.uproject")),
	});
	const progressStore = new ProgressStore(new NodeFileSystem(), app.getPath("userData"));
	const progressService = await ProgressService.openOrRefuse(progressStore, new SystemClock(), new MathRandomSource());
	const refusal = progressService.getRefusal();

	const contentCatalog = createContentCatalog(resolveContentRoot({ isPackaged: app.isPackaged, resourcesPath: process.resourcesPath, appPath: app.getAppPath() }));
	contentCatalog.startLoading();

	// A refused save still lets the app open; every progress call answers the save-failed error so the renderer can show it.
	if (refusal) console.error(`Progress refused: ${refusal.message} ${refusal.detail ?? ""}`);

	// One line per run start and answer in main's console, so a stuck screen can be traced to main or to the window (A823).
	const runRegistry = new RunRegistry((line) => console.info(line));

	let unrealServices: UnrealServices | null = null;

	// Pending progress saves get up to 3 s to finish before quitting (A1211).
	holdQuitForSaves(app, progressService);

	// Runs, then the editor, before quitting; never builds the Unreal services just to quit (A530).
	stopEngineWorkBeforeQuit(app, { runs: runRegistry, editorLauncher: () => unrealServices?.editorLauncher ?? null });

	const getUnrealServices = (): UnrealServices =>
		(unrealServices ??= createUnrealServices({
			templateFolder: appResourceFolder(["resources", "sandbox-template"], ["resources", "sandbox-template"]),
			solutionsFolder: appResourceFolder(["solutions"], ["tools", "solutions"]),
			engineInspector: getEngineLocator(),
			settings: new SettingsServiceUnrealSettings(settingsService),
			quests: contentCatalog,
			learner: {
				isPassed: (questId) => progressService.getProgress().quests[questId]?.status === "passed",
				savedFiles: (questId) => progressService.getProgress().quests[questId]?.savedFiles ?? {},
			},
		}));

	// Built on first use: the review service with the settings-backed providers (D11), for the Title chip, the review methods, Submit, and the progress graders.
	let reviewService: ReviewService | null = null;
	const getReviewService = (): ReviewService =>
		(reviewService ??= createReviewService(new SafeStorageReviewSettings({ currentSettings: () => settingsService.current(), loadEncryptedApiKey: () => settingsService.loadEncryptedApiKey(), decryptor: safeStorage })));

	const environmentStatusReader = new EnvironmentStatusReader({
		currentSettings: () => settingsService.current(),
		inspectEngine: (folder) => getEngineLocator().inspectFolder(folder),
		pathExists,
		reviewStatuses: () => getReviewService().getProviderStatuses(),
		editorConnected: async () => (unrealServices ? unrealServices.editorService.isConnected() : false),
		checkToolchain: () => getEngineLocator().checkToolchain(),
		saveRefusal: () => progressService.getRefusal(),
		saveLoadRecovery: () => progressService.getLoadRecovery(),
	});

	// Breakdowns and explain items are graded by the review service; it falls back to tests only on its own (replaces A318, A460).
	const graders: ProgressGraders = { gradeExplain: (input) => getReviewService().gradeExplain(input), gradeBreakdown: (input) => getReviewService().gradeBreakdown(input) };
	const progressContentService = new ProgressContentService(contentCatalog, progressService, graders, new MathRandomSource(), () => randomUUID());

	let reviewHandlers: ReviewHandlers | null = null;
	const getReviewHandlers = (): ReviewHandlers =>
		(reviewHandlers ??= createReviewHandlers({
			reviewService: getReviewService(),
			content: contentCatalog,
			progress: progressService,

			// The same run path as runQuest: prerequisite fill, file writing, the runner, and its progress events (M1.3b).
			runQuest: (request, onProgress, signal) => getUnrealServices().questRunService.runQuest(request.questId, request.files, onProgress, signal),
		}));

	registerHandlers(
		ipcMain,
		createHandlers({
			getAppVersion: () => app.getVersion(),
			getEngineLocator,
			getContentCatalog: () => contentCatalog,
			pickFolder,
			progressService,
			progressContentService,
			getSandboxService: () => getUnrealServices().sandboxService,
			getQuestRunService: () => getUnrealServices().questRunService,
			getEditorService: () => getUnrealServices().editorService,
			runRegistry,
			sendProgress: sendBuildProgress,
			settingsService,
			readEnvironmentStatus: () => environmentStatusReader.read(),
			checkToolchain: () => environmentStatusReader.refreshToolchain(),
			getReviewHandlers,
		}),
	);
	openMainWindow();

	app.on("activate", () =>
	{
		if (BrowserWindow.getAllWindows().length === 0) openMainWindow();
	});
}

/** Opens the main window and reloads it once if its page process dies (A1212). */
function openMainWindow(): void
{
	const window = createMainWindow();

	reloadOnceOnRendererCrash(window.webContents, (message) => console.warn(message));
}

/** A folder shipped next to the asar when packaged (extraResources), or in the source tree in development: the sandbox template, the reference solutions (A404). */
function appResourceFolder(packagedParts: string[], sourceParts: string[]): string
{
	return app.isPackaged ? join(process.resourcesPath, ...packagedParts) : join(app.getAppPath(), ...sourceParts);
}

app.on("window-all-closed", () =>
{
	if (process.platform !== "darwin") app.quit();
});

start().catch((error: unknown) =>
{
	showStartupFailure(error, {
		log: (message, failure) => console.error(message, failure),
		showErrorBox: (title, content) => dialog.showErrorBox(title, content),
		quit: () => app.quit(),
	});
});
