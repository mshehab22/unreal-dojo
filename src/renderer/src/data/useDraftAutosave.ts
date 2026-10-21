// Autosaves a quest draft a few seconds after the last change, and at once on demand (blur, Cmd/Ctrl+S, leaving the screen).
import { useCallback, useEffect, useRef, useState } from "react";

import type { QuestDraft } from "@shared/types/progress";

import { dojo } from "./activeClient";

/** Where the draft stands: nothing changed since the last save, waiting to save, saving, or the last save failed. */
export type AutosaveStatus = "saved" | "pending" | "saving" | "failed";

/** The status and a function that saves right now. */
export interface DraftAutosave
{
	status: AutosaveStatus;
	saveNow: () => Promise<void>;
}

/** Saves `draft` through `saveQuestDraft` `delayMs` after it last changed. The first draft (as loaded) is not saved back. */
export function useDraftAutosave(draft: QuestDraft, delayMs = 3000): DraftAutosave
{
	const [status, setStatus] = useState<AutosaveStatus>("saved");
	const latest = useRef(draft);
	const isFirst = useRef(true);
	const dirty = useRef(false);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	latest.current = draft;

	const saveNow = useCallback(async (): Promise<void> =>
	{
		if (timer.current) clearTimeout(timer.current);

		timer.current = null;

		if (!dirty.current) return;

		dirty.current = false;
		setStatus("saving");

		try
		{
			await dojo().saveQuestDraft(latest.current);
			setStatus(dirty.current ? "pending" : "saved");
		}
		catch
		{
			dirty.current = true;
			setStatus("failed");
		}
	}, []);

	// A change marks the draft dirty and restarts the timer.
	useEffect(() =>
	{
		if (isFirst.current)
		{
			isFirst.current = false;
			return;
		}

		dirty.current = true;
		setStatus("pending");

		if (timer.current) clearTimeout(timer.current);

		timer.current = setTimeout(() => void saveNow(), delayMs);
	}, [JSON.stringify(draft)]);

	// Leaving the screen saves what is left.
	useEffect(() => () => void saveNow(), []);

	return { status, saveNow };
}
