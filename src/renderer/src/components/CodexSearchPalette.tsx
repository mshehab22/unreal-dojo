// The Cmd/Ctrl+K Codex search panel. A placeholder until the Codex task wires it to the glossary.
import { SearchIcon } from "lucide-react";

import { usePanelStore } from "@/app/usePanelStore";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

/** The search panel over the frame. Opens from the shortcut or the rail; Esc closes it. */
export function CodexSearchPalette()
{
	const isOpen = usePanelStore((state) => state.isCodexSearchOpen);
	const setOpen = usePanelStore((state) => state.setCodexSearchOpen);

	return (
		<Dialog open={isOpen} onOpenChange={setOpen}>
			<DialogContent data-testid="codex-search" showCloseButton={false} className="gap-0 overflow-hidden p-0">
				<DialogTitle className="sr-only">Search the Codex</DialogTitle>
				<div className="flex items-center gap-3 border-b border-line px-5">
					<SearchIcon className="size-5 text-pack" strokeWidth={1.75} />
					<input
						autoFocus
						placeholder="Search terms, macros, classes..."
						aria-label="Search the Codex"
						className="h-14 flex-1 bg-transparent text-lg text-paper outline-none placeholder:text-paper-faint"
					/>
				</div>
				<div className="px-5 py-8 text-center">
					<DialogDescription className="text-sm text-paper-muted">
						The glossary arrives with the Codex. Searching here will jump to any term you have met.
					</DialogDescription>
				</div>
				<div className="flex items-center justify-end gap-2 border-t border-line bg-raised/50 px-5 py-2.5 text-xs text-paper-faint">
					<Kbd>Esc</Kbd>
					<span>to close</span>
				</div>
			</DialogContent>
		</Dialog>
	);
}
