// The Codex's left column: search box, category filter, and the matching terms.
import { SearchIcon } from "lucide-react";

import type { GlossaryEntry } from "@shared/types/content";

import { Kbd } from "@/components/ui/kbd";
import { modifierKeyLabel } from "@/lib/platform";
import { cn } from "@/lib/utils";

/** Props for CodexEntryList. */
interface CodexEntryListProps
{
	readonly entries: readonly GlossaryEntry[];
	readonly categories: readonly string[];
	readonly query: string;
	readonly category: string | null;
	readonly selectedId: string | null;
	readonly onQueryChange: (query: string) => void;
	readonly onCategoryChange: (category: string | null) => void;
	readonly onSelect: (termId: string) => void;
}

/** Search, filter, and pick a term. */
export function CodexEntryList({ entries, categories, query, category, selectedId, onQueryChange, onCategoryChange, onSelect }: CodexEntryListProps)
{
	return (
		<div className="flex min-h-0 flex-col gap-3">
			<label className="flex h-10 items-center gap-2 rounded-md border border-line-strong bg-raised px-3 focus-within:border-pack">
				<SearchIcon className="size-4 text-paper-faint" />
				<input
					value={query}
					onChange={(event) => onQueryChange(event.target.value)}
					placeholder="Filter terms"
					aria-label="Filter the Codex"
					className="min-w-0 flex-1 bg-transparent text-sm text-paper outline-none placeholder:text-paper-faint"
				/>
				<span className="flex gap-1">
					<Kbd>{modifierKeyLabel()}</Kbd>
					<Kbd>K</Kbd>
				</span>
			</label>
			<select
				value={category ?? ""}
				onChange={(event) => onCategoryChange(event.target.value || null)}
				aria-label="Category"
				data-testid="codex-category"
				className="h-9 rounded-md border border-line bg-surface px-2 text-sm text-paper-muted outline-none focus:border-pack"
			>
				<option value="">All categories</option>
				{categories.map((name) => (
					<option key={name} value={name}>
						{name}
					</option>
				))}
			</select>
			<div className="font-mono text-2xs tracking-widest text-paper-faint uppercase">{entries.length} terms</div>
			<ul data-testid="codex-list" className="-mr-2 flex max-h-[calc(100vh-22rem)] min-h-40 flex-col gap-0.5 overflow-y-auto pr-2">
				{entries.map((entry) => (
					<li key={entry.id}>
						<button
							type="button"
							onClick={() => onSelect(entry.id)}
							aria-current={entry.id === selectedId ? "true" : undefined}
							className={cn(
								"flex w-full flex-col rounded-md px-3 py-2 text-left transition-colors duration-(--duration-fast)",
								entry.id === selectedId ? "bg-raised text-paper" : "text-paper-muted hover:bg-raised/60 hover:text-paper",
							)}
						>
							<span className="font-mono text-sm">{entry.term}</span>
							<span className="text-2xs text-paper-faint">{entry.category}</span>
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
