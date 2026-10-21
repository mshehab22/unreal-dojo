// App-wide keyboard shortcuts: Cmd/Ctrl+K toggles Codex search, Esc closes any open panel.
import { useEffect } from "react";

import { usePanelStore } from "@/app/usePanelStore";
import { hasShortcutModifier } from "@/lib/platform";

/** Listens for the frame's global shortcuts for as long as the calling component is mounted. */
export function useGlobalShortcuts(): void
{
	useEffect(() =>
	{
		const onKeyDown = (event: KeyboardEvent): void =>
		{
			const panels = usePanelStore.getState();

			if (hasShortcutModifier(event) && event.key.toLowerCase() === "k")
			{
				event.preventDefault();
				panels.toggleCodexSearch();
				return;
			}

			if (event.key === "Escape")
			{
				panels.closeAllPanels();
			}
		};

		window.addEventListener("keydown", onKeyDown);

		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);
}
