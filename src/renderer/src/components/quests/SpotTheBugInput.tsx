// Spot the bug: every line of the snippet is a choice; the learner picks the wrong one. After grading the bug line is marked.
import { cn } from "@/lib/utils";

/** Props for SpotTheBugInput. */
interface SpotTheBugInputProps
{
	readonly name: string;
	readonly code: string;
	readonly selected: string | null;
	readonly onSelect: (line: string) => void;
	readonly disabled?: boolean;

	/** After grading: the bug's line number. */
	readonly bugLine?: number;
}

/** The snippet as a column of selectable lines with numbers. Arrow keys move between lines. */
export function SpotTheBugInput({ name, code, selected, onSelect, disabled = false, bugLine }: SpotTheBugInputProps)
{
	const lines = code.split("\n");

	return (
		<fieldset disabled={disabled} className="overflow-x-auto rounded-md border border-line bg-ink py-2 font-mono text-xs">
			<legend className="sr-only">Pick the line with the bug</legend>
			{lines.map((line, index) =>
			{
				const lineNumber = String(index + 1);
				const isPicked = selected === lineNumber;
				const isBug = bugLine === index + 1;

				return (
					<label
						key={lineNumber}
						data-testid="bug-line"
						data-picked={isPicked}
						className={cn(
							"flex cursor-pointer items-center gap-3 border-l-2 px-3 py-0.5 has-focus-visible:bg-overlay",
							isBug ? "border-pass bg-pass/10" : isPicked ? (bugLine !== undefined ? "border-fail bg-fail/10" : "border-pack bg-pack-soft") : "border-transparent hover:bg-raised",
						)}
					>
						<input type="radio" name={name} value={lineNumber} checked={isPicked} onChange={() => onSelect(lineNumber)} className="sr-only" />
						<span aria-hidden="true" className="w-5 text-right text-paper-faint tabular-nums">
							{lineNumber}
						</span>
						<span className="whitespace-pre text-paper">{line || " "}</span>
					</label>
				);
			})}
		</fieldset>
	);
}
