// Takes the screenshots a test asks for and copies them into docs/iterations/ as proof when the test passes with SAVE_PROOF=1.
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

import type { Page, TestInfo } from "@playwright/test";

/** A screenshot already saved under test-results/ that should become a proof picture if the test passes. */
interface PendingProof
{
	savedPath: string;
	proofFileName: string;
}

/** Saves screenshots to the test's own test-results/ folder; only a passing test's screenshots are copied to docs/iterations/. */
export class ProofCamera
{
	private readonly pendingProofs: PendingProof[] = [];

	/** Binds the camera to one test, so file names land in that test's output folder. */
	constructor(private readonly testInfo: TestInfo)
	{
	}

	/** Screenshots the page as `fileName` under test-results/; with SAVE_PROOF=1 it is also queued for docs/iterations/ (same name unless `proofFileName` is given). */
	async capture(page: Page, fileName: string, proofFileName: string = fileName): Promise<void>
	{
		const savedPath = this.testInfo.outputPath(fileName);

		await page.screenshot({ path: savedPath });
		this.pendingProofs.push({ savedPath, proofFileName });
	}

	/** Called after the test: with SAVE_PROOF=1 and a passing test, copies every queued screenshot into docs/iterations/. */
	copyProofsIfPassed(): void
	{
		const passed = this.testInfo.status === this.testInfo.expectedStatus;

		if (!passed || process.env["SAVE_PROOF"] !== "1") return;

		for (const proof of this.pendingProofs)
		{
			copyFileSync(proof.savedPath, resolve("docs/iterations", proof.proofFileName));
		}
	}
}
