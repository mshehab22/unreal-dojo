// The `test` every e2e spec imports: each test gets its own freshly launched app (`dojo`) and a screenshot helper (`camera`).
import { test as base } from "@playwright/test";

import { closeDojo, launchDojo, type DojoSession } from "./launchDojo";
import { ProofCamera } from "./ProofCamera";

/** The per-test fixtures this harness adds to Playwright's. */
interface DojoFixtures
{
	/** The app, launched before the test with an empty userData folder, photographed as `failure.png` if the test failed, and closed after it. */
	dojo: DojoSession;

	/** Screenshots into test-results/, copied to docs/iterations/ when the test passes with SAVE_PROOF=1. */
	camera: ProofCamera;
}

/** Playwright's `test`, extended with the Dojo fixtures. */
export const test = base.extend<DojoFixtures>({
	dojo: async ({}, use, testInfo) =>
	{
		const session = await launchDojo();

		try
		{
			await use(session);

			// Every failing test leaves a picture of the window as it was, so a red CI run still uploads a screenshot.
			// A crashed or closed window cannot be photographed; the failure itself is still reported.
			if (testInfo.status !== testInfo.expectedStatus)
			{
				await session.window.screenshot({ path: testInfo.outputPath("failure.png") }).catch(() => undefined);
			}
		}
		finally
		{
			// Main's console from when the window opens (slow IPC calls, failed handlers, content problems) goes into the report of a failing test, so CI shows what main was doing (W12).
			if (testInfo.status !== testInfo.expectedStatus)
			{
				await testInfo.attach("main-process.log", { body: session.mainLog.join("\n") || "(main wrote nothing)", contentType: "text/plain" });
			}

			await closeDojo(session);
		}
	},

	camera: async ({}, use, testInfo) =>
	{
		const camera = new ProofCamera(testInfo);

		await use(camera);
		camera.copyProofsIfPassed();
	},
});

export { expect } from "@playwright/test";
