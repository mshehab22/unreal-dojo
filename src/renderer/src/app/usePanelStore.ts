// Which overlay panels are open. Shortcuts and buttons anywhere in the app open and close them through this store.
import { create } from "zustand";

/** Open state for the frame's overlay panels, and the actions that change it. */
interface PanelState
{
	readonly isCodexSearchOpen: boolean;
	setCodexSearchOpen: (isOpen: boolean) => void;
	toggleCodexSearch: () => void;
	closeAllPanels: () => void;
}

/** The panel store. Later panels (Codex entry, hover card details) add their flag here so Esc closes them too. */
export const usePanelStore = create<PanelState>((set) => ({
	isCodexSearchOpen: false,
	setCodexSearchOpen: (isOpen) => set({ isCodexSearchOpen: isOpen }),
	toggleCodexSearch: () => set((state) => ({ isCodexSearchOpen: !state.isCodexSearchOpen })),
	closeAllPanels: () => set({ isCodexSearchOpen: false }),
}));
