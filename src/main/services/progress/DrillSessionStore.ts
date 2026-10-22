// Drill sessions in memory between startDrill and finishDrill. A session lost to a restart only loses the unanswered items; answers are already saved.
import type { DrillRequest, DrillSession } from "@shared/types/drill";

import type { DrillVariant } from "./DrillItemBank";

/** One started session and what has been answered. */
export interface StoredDrillSession
{
	/** The session as the renderer received it. */
	session: DrillSession;

	/** Each item's variant (skill, world) by item id. */
	variants: Map<string, DrillVariant>;

	/** Whether each answered item was right, by item id. Items count once. */
	answers: Map<string, boolean>;

	/** Item ids answered but only self-checked (no AI grader): left out of the right and wrong counts (A801). */
	selfChecked: Set<string>;

	/** True when the session held at least one scheduled due item, so finishing it pays drill XP and streak credit (A320). */
	rewarded: boolean;
}

/** Holds open sessions by id. */
export class DrillSessionStore
{
	/** Open sessions by id. */
	private readonly sessions = new Map<string, StoredDrillSession>();

	/** Makes each new session id. */
	constructor(private readonly createId: () => string)
	{}

	/** Opens a session for the request with these variants, in order. */
	open(request: DrillRequest, variants: DrillVariant[], rewarded: boolean): StoredDrillSession
	{
		const sessionId = this.createId();
		const stored: StoredDrillSession = {
			session: { sessionId, request, items: variants.map((variant) => ({ itemId: variant.itemId, item: variant.item })) },
			variants: new Map(variants.map((variant) => [variant.itemId, variant])),
			answers: new Map(),
			selfChecked: new Set(),
			rewarded,
		};

		this.sessions.set(sessionId, stored);

		return stored;
	}

	/** The open session with this id, or undefined. */
	get(sessionId: string): StoredDrillSession | undefined
	{
		return this.sessions.get(sessionId);
	}

	/** Closes a session. */
	close(sessionId: string): void
	{
		this.sessions.delete(sessionId);
	}
}
