// A radio group of answer cards. Arrow keys move between choices (native radios); after grading, the right and the picked wrong choice are marked.
import { CheckIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** One choice: the value sent as the answer and what the card shows. */
export interface ChoiceOption
{
	value: string;
	label: ReactNode;
}

/** Props for ChoiceList. */
interface ChoiceListProps
{
	readonly name: string;
	readonly options: readonly ChoiceOption[];
	readonly selected: string | null;
	readonly onSelect: (value: string) => void;
	readonly disabled?: boolean;

	/** After grading: the right value, so it and a wrong pick can be marked. */
	readonly rightValue?: string;
	readonly label: string;
}

/** Choices as cards in a fieldset; one can be picked. */
export function ChoiceList({ name, options, selected, onSelect, disabled = false, rightValue, label }: ChoiceListProps)
{
	return (
		<fieldset className="flex flex-col gap-2" disabled={disabled}>
			<legend className="sr-only">{label}</legend>
			{options.map((option, index) =>
			{
				const isPicked = selected === option.value;
				const isRight = rightValue !== undefined && option.value === rightValue;
				const isWrongPick = rightValue !== undefined && isPicked && !isRight;

				return (
					<label
						key={option.value}
						data-testid="choice"
						data-picked={isPicked}
						data-right={isRight}
						className={cn(
							"flex cursor-pointer items-start gap-3 rounded-md border bg-raised px-4 py-3 text-sm transition-colors duration-(--duration-fast) has-focus-visible:ring-2 has-focus-visible:ring-ring",
							isRight ? "border-pass bg-pass/10" : isWrongPick ? "border-fail bg-fail/10" : isPicked ? "border-pack bg-pack-soft" : "border-line hover:border-line-strong",
							disabled && "cursor-default",
						)}
					>
						<input type="radio" name={name} value={option.value} checked={isPicked} onChange={() => onSelect(option.value)} className="sr-only" />
						<span className={cn("flex size-6 shrink-0 items-center justify-center rounded-pill border font-mono text-2xs", isPicked ? "border-pack text-pack" : "border-line-strong text-paper-faint")}>
							{isRight ? <CheckIcon className="size-3.5 text-pass" strokeWidth={3} /> : isWrongPick ? <XIcon className="size-3.5 text-fail" strokeWidth={3} /> : String.fromCharCode(65 + index)}
						</span>
						<span className="min-w-0 flex-1 pt-0.5 text-paper">{option.label}</span>
					</label>
				);
			})}
		</fieldset>
	);
}
