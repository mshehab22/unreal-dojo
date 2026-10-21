// The Cmd/Ctrl+K Codex search panel: type, move with the arrow keys, Enter opens the term in the Codex.
import { SearchIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";

import { useNavigate } from "@/app/router/useRoute";
import { useCodexStore } from "@/app/useCodexStore";
import { usePanelStore } from "@/app/usePanelStore";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoQuery } from "@/data/useDojoQuery";
import { hasPointerMoved, type PointerPosition } from "@/lib/pointerMovement";
import { searchGlossary } from "@/lib/searchGlossary";
import { cn } from "@/lib/utils";

import { AppErrorView } from "./AppErrorView";

/** How many results the palette lists. */
const RESULT_LIMIT = 8;

/** The search panel over the frame. Opens from the shortcut or the rail; Esc closes it. */
export function CodexSearchPalette()
{
	const isOpen = usePanelStore((state) => state.isCodexSearchOpen);
	const setOpen = usePanelStore((state) => state.setCodexSearchOpen);
	const selectTerm = useCodexStore((state) => state.selectTerm);
	const navigate = useNavigate();
	const glossary = useDojoQuery(QUERY_KEYS.glossary, (client) => client.getGlossary());
	const [query, setQuery] = useState("");
	const [activeIndex, setActiveIndex] = useState(0);
	const lastPointer = useRef<PointerPosition | null>(null);

	// Each opening starts fresh: wherever the pointer rests now, it has not moved inside this palette yet.
	useEffect(() =>
	{
		lastPointer.current = null;
	}, [isOpen]);

	const results = useMemo(() => (query.trim() ? searchGlossary(glossary.data ?? [], query).slice(0, RESULT_LIMIT) : []), [glossary.data, query]);

	/** Opens a term in the Codex and closes the palette. */
	const open = (termId: string): void =>
	{
		selectTerm(termId);
		setOpen(false);
		setQuery("");
		navigate("codex");
	};

	/**
	 * Moves the highlight to a row only when the pointer itself moved. Rows that appear or slide under a still pointer (typing, the
	 * panel's rise-in) send enter and move events too; those must not steal the keyboard's highlight.
	 */
	const onRowPointerMove = (event: MouseEvent, index: number): void =>
	{
		const position = { x: event.clientX, y: event.clientY };
		const moved = hasPointerMoved(lastPointer.current, position);

		lastPointer.current = position;

		if (moved) setActiveIndex(index);
	};

	/** Arrow keys move the highlight; Enter opens it. */
	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void =>
	{
		if (event.key === "ArrowDown") setActiveIndex((index) => Math.min(results.length - 1, index + 1));
		if (event.key === "ArrowUp") setActiveIndex((index) => Math.max(0, index - 1));

		const active = results[activeIndex];

		if (event.key === "Enter" && active) open(active.id);
	};

	return (
		<Dialog open={isOpen} onOpenChange={setOpen}>
			<DialogContent data-testid="codex-search" aria-describedby={undefined} showCloseButton={false} className="gap-0 overflow-hidden p-0">
				<DialogTitle className="sr-only">Search the Codex</DialogTitle>
				<div className="flex items-center gap-3 border-b border-line px-5">
					<SearchIcon className="size-5 text-pack" strokeWidth={1.75} />
					<input
						autoFocus
						value={query}
						onChange={(event) =>
						{
							setQuery(event.target.value);
							setActiveIndex(0);
						}}
						onKeyDown={onKeyDown}
						placeholder="Search terms, macros, classes..."
						aria-label="Search the Codex"
						className="h-14 flex-1 bg-transparent text-lg text-paper outline-none placeholder:text-paper-faint"
					/>
				</div>
				{glossary.error && !glossary.data && <AppErrorView error={glossary.error} onRetry={glossary.reload} compact className="m-4" />}
				{results.length > 0 ? (
					<ul role="listbox" aria-label="Matching terms" data-testid="codex-search-results" className="flex flex-col p-2">
						{results.map((entry, index) => (
							<li key={entry.id} role="option" aria-selected={index === activeIndex}>
								<button
									type="button"
									onClick={() => open(entry.id)}
									onMouseMove={(event) => onRowPointerMove(event, index)}
									className={cn("flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left", index === activeIndex ? "bg-raised" : "")}
								>
									<span className="flex items-baseline gap-2">
										<span className="font-mono text-sm text-paper">{entry.term}</span>
										<span className="text-2xs text-paper-faint">{entry.category}</span>
									</span>
									<span className="line-clamp-1 text-xs text-paper-muted">{entry.short}</span>
								</button>
							</li>
						))}
					</ul>
				) : (
					<div className="px-5 py-8 text-center">
						<DialogDescription className="text-sm text-paper-muted">
							{query.trim() ? "No term matches that. Try a class name, a macro, or a word from its meaning." : "Type a term, a macro, or a class, such as UPROPERTY or TArray."}
						</DialogDescription>
					</div>
				)}
				<div className="flex items-center justify-end gap-2 border-t border-line bg-raised/50 px-5 py-2.5 text-xs text-paper-faint">
					<Kbd>↑</Kbd>
					<Kbd>↓</Kbd>
					<span className="mr-3">to move</span>
					<Kbd>Enter</Kbd>
					<span className="mr-3">to open</span>
					<Kbd>Esc</Kbd>
					<span>to close</span>
				</div>
			</DialogContent>
		</Dialog>
	);
}
