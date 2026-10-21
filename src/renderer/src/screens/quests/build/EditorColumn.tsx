// The build screen's center: file tabs over the Monaco editor, and under it the worked-level gate when the quest has marked lines.
import type { ReactNode } from "react";

import type { GlossaryAlias } from "@shared/types/catalog";

import { CodeEditor } from "@/components/quests/CodeEditor";
import type { EditorCommands } from "@/components/quests/monaco/MonacoCodeEditor";
import { cn } from "@/lib/utils";

/** Props for EditorColumn. */
interface EditorColumnProps
{
	readonly questId: string;
	readonly files: Readonly<Record<string, string>>;
	readonly fileOrder: readonly string[];
	readonly activeFile: string;
	readonly onActiveFileChange: (name: string) => void;
	readonly onFileChange: (name: string, value: string) => void;
	readonly onBlur: () => void;
	readonly readOnly: boolean;
	readonly markedLines: readonly number[];
	readonly aliases: readonly GlossaryAlias[];
	readonly termIds: readonly string[];
	readonly commands: EditorCommands;

	/** The self-explanation gate, under the editor. */
	readonly gate?: ReactNode;
}

/** Tabs (a tablist with arrow-key-free buttons, Tab moves between them), the editor filling the rest, then the gate. */
export function EditorColumn({ questId, files, fileOrder, activeFile, onActiveFileChange, onFileChange, onBlur, readOnly, markedLines, aliases, termIds, commands, gate }: EditorColumnProps)
{
	const editorFiles = fileOrder.map((name) => ({ name, value: files[name] ?? "" }));

	return (
		<div data-testid="editor-column" className="flex min-h-0 min-w-0 flex-col gap-3">
			<div role="tablist" aria-label="Files" className="flex shrink-0 gap-1 overflow-x-auto">
				{fileOrder.map((name) => (
					<button
						key={name}
						type="button"
						role="tab"
						data-testid="file-tab"
						aria-selected={name === activeFile}
						onClick={() => onActiveFileChange(name)}
						className={cn("shrink-0 rounded-t-md border-b-2 px-3 py-1.5 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring", name === activeFile ? "border-pack bg-surface text-paper" : "border-transparent text-paper-faint hover:text-paper")}
					>
						{name}
					</button>
				))}
			</div>
			<div className="min-h-48 flex-1 overflow-hidden rounded-lg border border-line">
				<CodeEditor modelKey={questId} files={editorFiles} activeFile={activeFile} onChange={onFileChange} onBlur={onBlur} readOnly={readOnly} markedLines={markedLines} aliases={aliases} questTermIds={termIds} commands={commands} ariaLabel={`Editing ${activeFile}`} />
			</div>
			{gate && <div className="max-h-[42%] shrink-0 overflow-y-auto">{gate}</div>}
		</div>
	);
}
