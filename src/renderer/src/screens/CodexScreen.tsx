// Codex: placeholder until the Codex task, with the search shortcut already working.
import { SearchIcon } from "lucide-react";

import { usePanelStore } from "@/app/usePanelStore";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { modifierKeyLabel } from "@/lib/platform";

/** The searchable glossary of every Unreal term the learner meets. */
export function CodexScreen()
{
	const openCodexSearch = usePanelStore((state) => state.setCodexSearchOpen);

	return (
		<PlaceholderScreen
			testId="screen-codex"
			index={5}
			title="Codex"
			summary="Every Unreal term you meet, in a sentence and in depth, with an example and a link to Epic's docs."
			upcoming={[
				"Category filters",
				"Short and long definitions",
				"Examples and related terms",
				"Where you met each term",
				"Drill me on this",
				"Your forgetting curve per term",
			]}
		>
			<div className="flex items-center gap-4">
				<Button variant="secondary" onClick={() => openCodexSearch(true)}>
					<SearchIcon />
					Search the Codex
				</Button>
				<span className="flex items-center gap-1.5 text-sm text-paper-faint">
					or press
					<Kbd>{modifierKeyLabel()}</Kbd>
					<Kbd>K</Kbd>
					anywhere
				</span>
			</div>
		</PlaceholderScreen>
	);
}
