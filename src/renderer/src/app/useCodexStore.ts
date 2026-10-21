// Which Codex entry is open and which category filter is on, shared by the Codex screen and the Cmd/Ctrl+K palette.
import { create } from "zustand";

/** Codex selection state and the actions that change it. */
interface CodexState
{
	readonly selectedTermId: string | null;
	readonly category: string | null;
	selectTerm: (termId: string | null) => void;
	setCategory: (category: string | null) => void;
}

/** The Codex store. The palette sets the selected term, then navigates to the Codex screen. */
export const useCodexStore = create<CodexState>((set) => ({
	selectedTermId: null,
	category: null,
	selectTerm: (termId) => set({ selectedTermId: termId }),
	setCategory: (category) => set({ category }),
}));
