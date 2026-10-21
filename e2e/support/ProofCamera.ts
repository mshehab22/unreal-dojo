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

/** How a captured screenshot becomes a proof picture. */
export interface ProofOptions
{
	/** The file name in docs/iterations/; the captured file's name when left out. */
	proofFileName?: string;

	/** `png` copies the captured picture; `jpeg` saves a smaller JPG at one pixel per CSS pixel (ui-core's M2.1 proofs). */
	proofFormat?: "png" | "jpeg";
}

/** Saves screenshots to the test's own test-results/ folder; only a passing test's screenshots are copied to docs/iterations/. */
export class ProofCamera
{
	private readonly pendingProofs: PendingProof[] = [];

	/** Binds the camera to one test, so file names land in that test's output folder. */
	constructor(private readonly testInfo: TestInfo)
	{
	}

	/** Screenshots the page as `fileName` under test-results/ and queues it as a proof picture, copied only if the test passes with SAVE_PROOF=1. */
	async capture(page: Page, fileName: string, options: ProofOptions = {}): Promise<void>
	{
		const savedPath = this.testInfo.outputPath(fileName);
		const proofFileName = options.proofFileName ?? fileName;

		await page.screenshot({ path: savedPath });

		if (options.proofFormat !== "jpeg")
		{
			this.pendingProofs.push({ savedPath, proofFileName });
			return;
		}

		// The page will have moved on by the time the test ends, so the JPG is taken now and only copied later.
		if (process.env["SAVE_PROOF"] !== "1") return;

		const jpegPath = this.testInfo.outputPath(proofFileName);

		await page.screenshot({ path: jpegPath, type: "jpeg", quality: 82, scale: "css" });
		this.pendingProofs.push({ savedPath: jpegPath, proofFileName });
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
