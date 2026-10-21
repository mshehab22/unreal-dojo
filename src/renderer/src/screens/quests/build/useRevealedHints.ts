// Remembers the hint texts revealed in this window, per quest. The contract hands a hint's text out only once, when it is bought (A222).
import { create } from "zustand";

import type { HintReveal } from "@shared/types/progress";

/** Revealed hints by quest id, in order. */
interface RevealedHintsState
{
	readonly byQuest: Readonly<Record<string, readonly HintReveal[]>>;
	add: (questId: string, hint: HintReveal) => void;
}

/** The revealed-hints store. Survives leaving and reopening a quest; a restart forgets the texts (see decisions). */
export const useRevealedHints = create<RevealedHintsState>((set) => ({
	byQuest: {},
	add: (questId, hint) => set((state) => ({ byQuest: { ...state.byQuest, [questId]: [...(state.byQuest[questId] ?? []).filter((held) => held.hintIndex !== hint.hintIndex), hint] } })),
}));
