// App lifecycle and composition root: builds services, registers IPC, and opens the window.
import { randomUUID } from "node:crypto";
import { renameSync } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";

import { app, BrowserWindow, dialog, ipcMain, safeStorage } from "electron";

import { createContentCatalog } from "./content/createContentCatalog";
import { resolveContentRoot } from "./content/resolveContentRoot";
import { createHandlers } from "./ipc/createHandlers";
import { registerHandlers } from "./ipc/registerHandlers";
import { sendBuildProgress } from "./ipc/sendBuildProgress";
import { createEngineLocator } from "./services/unreal/createEngineLocator";
import { createUnrealServices, type UnrealServices } from "./services/unreal/createUnrealServices";
import { SettingsServiceUnrealSettings } from "./services/unreal/SettingsServiceUnrealSettings";
import type { EngineLocator } from "./services/unreal/EngineLocator";
import { MathRandomSource } from "./services/progress/MathRandomSource";
import { NodeFileSystem } from "./services/progress/NodeFileSystem";
import { ProgressContentService } from "./services/progress/ProgressContentService";
import { createTestsOnlyGraders } from "./services/progress/ProgressGraders";
import { ProgressService } from "./services/progress/ProgressService";
import { ProgressStore } from "./services/progress/ProgressStore";
import { SystemClock } from "./services/progress/SystemClock";
import { createReviewService, type ReviewService } from "./services/review/ReviewService";
import { SafeStorageReviewSettings } from "./services/review/settings/SafeStorageReviewSettings";
import { ElectronSettingsStore } from "./services/settings/ElectronSettingsStore";
import { EnvironmentStatusReader } from "./services/settings/EnvironmentStatusReader";
import { openSettingsStore } from "./services/settings/openSettingsStore";
import { SettingsService } from "./services/settings/SettingsService";
import { RunRegistry } from "./services/unreal/RunRegistry";
import { createMainWindow } from "./window/createMainWindow";

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

	const runRegistry = new RunRegistry();
	stopRunsBeforeQuit(runRegistry);

	let unrealServices: UnrealServices | null = null;
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

	// Built on first use; read here only for the provider statuses. The review handlers are wired by ai-review.
	let reviewService: ReviewService | null = null;
	const getReviewService = (): ReviewService =>
		(reviewService ??= createReviewService(new SafeStorageReviewSettings({ currentSettings: () => settingsService.current(), loadEncryptedApiKey: () => settingsService.loadEncryptedApiKey(), decryptor: safeStorage })));

	const environmentStatusReader = new EnvironmentStatusReader({
		currentSettings: () => settingsService.current(),
		inspectEngine: (folder) => getEngineLocator().inspectFolder(folder),
		pathExists,
		reviewStatuses: () => getReviewService().getProviderStatuses(),
		editorConnected: async () => false,
	});

	// Tests-only graders stand in until the review service is wired with the settings service (A318).
	const progressContentService = new ProgressContentService(contentCatalog, progressService, createTestsOnlyGraders(), new MathRandomSource(), () => randomUUID());

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
			runRegistry,
			sendProgress: sendBuildProgress,
			settingsService,
			readEnvironmentStatus: () => environmentStatusReader.read(),
		}),
	);
	createMainWindow();

	app.on("activate", () =>
	{
		if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
	});
}

/** How long quitting waits for cancelled builds and test runs to end. Killing a process tree takes well under a second. */
const QUIT_WAIT_MS = 5000;

/** Cancels every running build and test before the app quits, so no UBT or editor is orphaned holding UBT's mutex. */
function stopRunsBeforeQuit(runRegistry: RunRegistry): void
{
	let stopping = false;

	app.on("before-quit", (event) =>
	{
		if (stopping || !runRegistry.hasRuns()) return;

		stopping = true;
		event.preventDefault();
		void runRegistry.cancelAll(QUIT_WAIT_MS).finally(() => app.quit());
	});
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
	console.error("Unreal Dojo failed to start", error);
});
