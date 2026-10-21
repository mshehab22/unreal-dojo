// Window size rules shared by every e2e spec: the spec's 1440x900, the 1100x700 minimum, and what the OS actually gives.
import type { ElectronApplication } from "@playwright/test";

/** A width and height in screen points. */
export interface WindowSize
{
	width: number;
	height: number;
}

/** What the main window measures right now, and the screen it sits on. */
export interface MeasuredWindowSizes
{
	bounds: WindowSize | undefined;
	minimum: number[] | undefined;
	workArea: WindowSize;
}

/** The size the app asks for (docs/systems/app-shell.md). */
export const SPEC_WINDOW_SIZE: WindowSize = { width: 1440, height: 900 };

/** The smallest size the window allows. */
export const MINIMUM_WINDOW_SIZE: WindowSize = { width: 1100, height: 700 };

/** The size the window should have on a screen this big: 1440x900 shrunk to the work area, but never below the 1100x700 minimum (A117). */
export function expectedWindowSize(workArea: WindowSize): WindowSize
{
	return {
		width: Math.max(MINIMUM_WINDOW_SIZE.width, Math.min(SPEC_WINDOW_SIZE.width, workArea.width)),
		height: Math.max(MINIMUM_WINDOW_SIZE.height, Math.min(SPEC_WINDOW_SIZE.height, workArea.height)),
	};
}

/** How far the height may differ when the screen limits it: macOS reports the work area 1 point off between launches (858 or 859 on the M5 Air, A118). */
export const WORK_AREA_HEIGHT_TOLERANCE = 1;

/** True when the screen, not the spec, sets the height, so the tolerance applies. */
export function heightIsLimitedByScreen(workArea: WindowSize): boolean
{
	return workArea.height < SPEC_WINDOW_SIZE.height && workArea.height > MINIMUM_WINDOW_SIZE.height;
}

/** Reads the first window's bounds and minimum size, and the primary screen's work area, from the main process. */
export async function measureWindowSizes(electronApp: ElectronApplication): Promise<MeasuredWindowSizes>
{
	return electronApp.evaluate(({ BrowserWindow, screen }) =>
	{
		const mainWindow = BrowserWindow.getAllWindows()[0];
		const bounds = mainWindow?.getBounds();

		return {
			bounds: bounds === undefined ? undefined : { width: bounds.width, height: bounds.height },
			minimum: mainWindow?.getMinimumSize(),
			workArea: screen.getPrimaryDisplay().workAreaSize,
		};
	});
}
