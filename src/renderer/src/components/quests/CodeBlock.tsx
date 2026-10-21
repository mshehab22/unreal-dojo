// Read-only code with line numbers, for examples, questions, and reference text. Lines can be highlighted or made pickable elsewhere.
import { cn } from "@/lib/utils";

/** Props for CodeBlock. */
interface CodeBlockProps
{
	readonly code: string;
	readonly className?: string;

	/** 1-based lines to tint. */
	readonly highlightLines?: readonly number[];
}

/** A monospace block with a gutter of line numbers; long lines scroll inside the block, never the page. */
export function CodeBlock({ code, className, highlightLines = [] }: CodeBlockProps)
{
	const lines = code.split("\n");

	return (
		<pre data-testid="code-block" className={cn("overflow-x-auto rounded-md border border-line bg-ink py-3 font-mono text-xs leading-relaxed text-paper select-text", className)}>
			<code className="grid grid-cols-[auto_1fr]">
				{lines.map((line, index) => (
					<span key={index} className={cn("contents", highlightLines.includes(index + 1) && "[&>span]:bg-warn/10")}>
						<span aria-hidden="true" className="pr-3 pl-3 text-right text-paper-faint/70 tabular-nums select-none">
							{index + 1}
						</span>
						<span className="pr-4 whitespace-pre">{line || " "}</span>
					</span>
				))}
			</code>
		</pre>
	);
}
