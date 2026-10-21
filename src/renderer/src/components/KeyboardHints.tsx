// A row of keyboard shortcuts, each a set of key caps and what it does.
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

/** One shortcut. */
export interface KeyboardHint
{
	keys: string[];
	label: string;
}

/** Props for KeyboardHints. */
interface KeyboardHintsProps
{
	readonly hints: readonly KeyboardHint[];
	readonly className?: string;
}

/** Shows shortcuts as key caps with a short label. */
export function KeyboardHints({ hints, className }: KeyboardHintsProps)
{
	return (
		<div data-testid="keyboard-hints" className={cn("flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-paper-faint", className)}>
			{hints.map((hint) => (
				<span key={hint.label} className="flex items-center gap-1.5">
					{hint.keys.map((key) => (
						<Kbd key={key}>{key}</Kbd>
					))}
					<span className="ml-0.5">{hint.label}</span>
				</span>
			))}
		</div>
	);
}
