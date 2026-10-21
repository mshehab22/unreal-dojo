// Creates the single app window with the security and size rules from docs/systems/app-shell.md.
import { join } from "node:path";

import { app, BrowserWindow, shell } from "electron";

const DEFAULT_WIDTH = 1440;
const DEFAULT_HEIGHT = 900;
const MINIMUM_WIDTH = 1100;
const MINIMUM_HEIGHT = 700;
const BACKGROUND_COLOR = "#0b0d12";

// Centers the macOS window buttons inside the renderer's 36px drag strip (TitleBarDragRegion).
const TRAFFIC_LIGHT_POSITION = { x: 14, y: 12 };

/** Opens the main window, loads the renderer, and sends any outside link to the system browser. */
export function createMainWindow(): BrowserWindow
{
	const isMac = process.platform === "darwin";

	const window = new BrowserWindow({
		width: DEFAULT_WIDTH,
		height: DEFAULT_HEIGHT,
		minWidth: MINIMUM_WIDTH,
		minHeight: MINIMUM_HEIGHT,
		show: false,
		backgroundColor: BACKGROUND_COLOR,
		title: "Unreal Dojo",
		titleBarStyle: isMac ? "hiddenInset" : "default",
		...(isMac ? { trafficLightPosition: TRAFFIC_LIGHT_POSITION } : {}),
		autoHideMenuBar: true,
		webPreferences: {
			preload: join(import.meta.dirname, "../preload/index.cjs"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
			// The preload answers window.dojo.isPackaged() from this flag, so dev-only switches stay off in installers (A251).
			additionalArguments: app.isPackaged ? ["--dojo-packaged"] : [],
		},
	});

	window.once("ready-to-show", () => window.show());

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

/** Hands a web link to the system browser; anything that is not http or https is ignored. */
function openInBrowser(url: string): void
{
	if (!/^https?:\/\//i.test(url)) return;

	void shell.openExternal(url);
}
