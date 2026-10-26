// Creates the single app window with the security and size rules from docs/systems/app-shell.md.
import { join } from "node:path";

import { app, BrowserWindow, screen, shell } from "electron";

import { isHiddenTestWindow } from "./testWindowMode";

const DEFAULT_WIDTH = 1440;
const DEFAULT_HEIGHT = 900;
const MINIMUM_WIDTH = 1100;
const MINIMUM_HEIGHT = 700;
const BACKGROUND_COLOR = "#0b0d12";

// Centers the macOS window buttons inside the renderer's 36px drag strip (TitleBarDragRegion).
const TRAFFIC_LIGHT_POSITION = { x: 14, y: 12 };

/** Opens the main window, loads the renderer, and sends any outside link to the system browser. In a hidden e2e run the window is never shown or focused. */
export function createMainWindow(): BrowserWindow
{
	const isMac = process.platform === "darwin";
	const isHidden = isHiddenTestWindow(process.env, app.isPackaged);
	const size = initialWindowSize();

	const window = new BrowserWindow({
		width: size.width,
		height: size.height,
		minWidth: MINIMUM_WIDTH,
		minHeight: MINIMUM_HEIGHT,
		show: false,
		backgroundColor: BACKGROUND_COLOR,
		title: "Unreal Dojo",
		titleBarStyle: isMac ? "hiddenInset" : "default",
		...(isMac ? { trafficLightPosition: TRAFFIC_LIGHT_POSITION } : {}),
		autoHideMenuBar: true,
		// A hidden test window still paints, so screenshots are real; it can never take keyboard focus from the person at the computer.
		paintWhenInitiallyHidden: true,
		focusable: !isHidden,
		webPreferences: {
			preload: join(import.meta.dirname, "../preload/index.cjs"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
			// The preload answers window.dojo.isPackaged() from this flag, so dev-only switches stay off in installers (A251).
			additionalArguments: app.isPackaged ? ["--dojo-packaged"] : [],
			// Chromium slows timers and animations in hidden windows; a hidden test window must run at full speed.
			backgroundThrottling: !isHidden,
		},
	});

	if (!isHidden) window.once("ready-to-show", () => window.show());

	window.webContents.setWindowOpenHandler(({ url }) =>
	{
		openInBrowser(url);
		return { action: "deny" };
	});

	window.webContents.on("will-navigate", (event, url) =>
	{
		if (url === window.webContents.getURL()) return;

		event.preventDefault();
		openInBrowser(url);
	});

	const developmentServerUrl = process.env["ELECTRON_RENDERER_URL"];

	if (developmentServerUrl)
	{
		void window.loadURL(developmentServerUrl);
	}
	else
	{
		void window.loadFile(join(import.meta.dirname, "../renderer/index.html"));
	}

	return window;
}

/** 1440x900 shrunk to the primary screen's work area, never below the 1100x700 minimum. macOS did this only for shown windows; doing it here gives hidden test windows and Windows the same size (A971). */
function initialWindowSize(): { width: number; height: number }
{
	const workArea = screen.getPrimaryDisplay().workAreaSize;

	return {
		width: Math.max(MINIMUM_WIDTH, Math.min(DEFAULT_WIDTH, workArea.width)),
		height: Math.max(MINIMUM_HEIGHT, Math.min(DEFAULT_HEIGHT, workArea.height)),
	};
}

/** Hands a web link to the system browser; anything that is not http or https is ignored. */
function openInBrowser(url: string): void
{
	if (!/^https?:\/\//i.test(url)) return;

	void shell.openExternal(url);
}
