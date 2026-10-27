// A small environment chip: a colored dot, a label, and a value, used on Title and First-run.
import type { ChipTone } from "@/lib/environmentChipStates";
import { cn } from "@/lib/utils";

/** Props for StatusChip. */
interface StatusChipProps
{
	readonly label: string;
	readonly value: string;
	readonly tone: ChipTone;
	readonly title?: string;
	readonly testId?: string;
}

/** The dot color for each tone. */
const DOT_CLASS: Readonly<Record<ChipTone, string>> = {
	pass: "bg-pass",
	warn: "bg-warn",
	fail: "bg-fail",
	neutral: "bg-line-strong",
};

/** One chip: label in mono caps, value beside it. */
export function StatusChip({ label, value, tone, title, testId }: StatusChipProps)
{
	return (
		<div data-testid={testId} data-tone={tone} title={title} className="flex h-9 items-center gap-2.5 rounded-md border border-line bg-surface/80 px-3">
			<span aria-hidden="true" className={cn("size-2 shrink-0 rounded-pill", DOT_CLASS[tone])} />
			<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">{label}</span>
			<span className="text-sm text-paper">{value}</span>
		</div>
	);
}
