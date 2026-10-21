// Checks the e2e harness itself: each test gets its own empty userData folder, dialog stubs answer, and the window size rule has its floor.
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { stubMessageBox, stubOpenDialog } from "./support/dialogStubs";
import { expect, test } from "./support/dojoTest";
import { closeDojo, launchDojo } from "./support/launchDojo";
import { expectedWindowSize } from "./support/windowSize";

/** A file one launch leaves in its userData folder, which the next launch must not see. */
const MARKER_FILE_NAME = "harness-marker.txt";

test("the app uses the harness's temporary userData folder", async ({ dojo }) =>
{
	const userDataPath = await dojo.electronApp.evaluate(({ app }) => app.getPath("userData"));

	expect(userDataPath).toBe(dojo.userDataFolder);
});

test("a later launch starts with a different, empty userData folder and the old one is gone", async ({ dojo }) =>
{
	// The fixture's launch plays the earlier test; a second launch inside this test plays the later one, so the order of tests does not matter.
	writeFileSync(join(dojo.userDataFolder, MARKER_FILE_NAME), "left by the earlier launch");

	const firstFolder = dojo.userDataFolder;
	await closeDojo(dojo);
	expect(existsSync(firstFolder)).toBe(false);

	const later = await launchDojo();

	try
	{
		expect(later.userDataFolder).not.toBe(firstFolder);
		expect(existsSync(join(later.userDataFolder, MARKER_FILE_NAME))).toBe(false);
	}
	finally
	{
		await closeDojo(later);
	}
});

test("stubbed dialogs answer without showing a native window", async ({ dojo }) =>
{
	const pickedFolder = join(dojo.userDataFolder, "picked");

	await stubOpenDialog(dojo.electronApp, pickedFolder);
	const picked = await dojo.electronApp.evaluate(({ dialog }) => dialog.showOpenDialog({ properties: ["openDirectory"] }));
	expect(picked).toEqual({ canceled: false, filePaths: [pickedFolder] });

	await stubOpenDialog(dojo.electronApp, null);
	const cancelled = await dojo.electronApp.evaluate(({ dialog }) => dialog.showOpenDialog({ properties: ["openDirectory"] }));
	expect(cancelled).toEqual({ canceled: true, filePaths: [] });

	await stubMessageBox(dojo.electronApp, 1);
	const answer = await dojo.electronApp.evaluate(({ dialog }) => dialog.showMessageBox({ message: "Reset?", buttons: ["Cancel", "Reset"] }));
	expect(answer.response).toBe(1);
});

test("the expected window size never drops below the 1100x700 minimum", () =>
{
	expect(expectedWindowSize({ width: 1024, height: 768 })).toEqual({ width: 1100, height: 768 });
	expect(expectedWindowSize({ width: 800, height: 600 })).toEqual({ width: 1100, height: 700 });
	expect(expectedWindowSize({ width: 1280, height: 800 })).toEqual({ width: 1280, height: 800 });
	expect(expectedWindowSize({ width: 2560, height: 1440 })).toEqual({ width: 1440, height: 900 });
});
