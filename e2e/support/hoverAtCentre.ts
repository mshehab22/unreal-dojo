// Pointer helpers for hover tests that hold up on hidden windows under load (A77, W5, W9): scroll without a frame wait, then move onto the element centre.
import type { Locator, Page } from "@playwright/test";

/** How long each step may take; a hidden window's frames arrive about a second apart under load, so a step must not wait on frame stability. */
const STEP_TIMEOUT_MILLISECONDS = 3_000;

/**
 * Scrolls an element to the middle of its scroll parents with the browser's own call, without Playwright's wait for the element to hold still.
 * The function is passed as a function, not a string: Playwright evaluates a string as an expression and never calls it (W9).
 */
export async function scrollIntoViewNow(target: Locator): Promise<void>
{
	await target.evaluate((node: { scrollIntoView(options: object): void }) => node.scrollIntoView({ block: "center", inline: "center" }), undefined, { timeout: STEP_TIMEOUT_MILLISECONDS });
}

/**
 * Moves the pointer away, scrolls the element into view itself, reads its box, and moves the pointer to its centre.
 * Playwright's own scroll and hover wait for the element to hold still across two frames, which ran out of time under load. Call this inside
 * `expect(...).toPass`, so a hover that lands while the page settles is retried with the locator found again. The pointer moves first so that
 * the move onto the element is a real one, which is what opens a hover card or a tooltip.
 */
export async function hoverAtCentre(window: Page, target: Locator): Promise<void>
{
	await window.mouse.move(5, 5);
	await scrollIntoViewNow(target);

	const box = await target.boundingBox({ timeout: STEP_TIMEOUT_MILLISECONDS });

	if (!box) throw new Error("The element has no box yet.");

	await window.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
}
