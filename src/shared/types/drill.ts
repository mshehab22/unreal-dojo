// How the renderer starts a drill session and what it gets back. Grading and scheduling belong to progress-and-rules (M1.6).
import type { DrillItem } from "./content";

/** Which drill to start: today's due items, a world's test-out, or the Parsons fallback offered after two failed submits (A89). */
export type DrillRequest =
	| { kind: "due" }
	| { kind: "test-out"; packId: string; worldId: string }
	| { kind: "parsons-fallback"; questId: string };

/** One item of a drill session, with the id `answerDrillItem` takes. */
export interface DrillSessionItem
{
	/** The id the answer is sent with. */
	itemId: string;

	/** The item itself, with its source. */
	item: DrillItem;
}

/** A started drill session. */
export interface DrillSession
{
	/** The id `answerDrillItem` and `finishDrill` take. */
	sessionId: string;

	/** What was asked for. */
	request: DrillRequest;

	/** The items in the order to show them (6 to 10 for a due drill, one for the Parsons fallback). */
	items: DrillSessionItem[];
}
