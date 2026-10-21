// A row of mutually exclusive options, like a radio group drawn as joined buttons.
import { cn } from "@/lib/utils";

/** One option. */
export interface SegmentOption<Value extends string>
{
	value: Value;
	label: string;
	disabled?: boolean;
	title?: string;
}

/** Props for SegmentedControl. */
interface SegmentedControlProps<Value extends string>
{
	readonly label: string;
	readonly options: readonly SegmentOption<Value>[];
	readonly value: Value;
	readonly onChange: (value: Value) => void;
	readonly disabled?: boolean;
}

/** Joined option buttons; the chosen one is filled. */
export function SegmentedControl<Value extends string>({ label, options, value, onChange, disabled = false }: SegmentedControlProps<Value>)
{
	return (
		<div role="radiogroup" aria-label={label} className="inline-flex w-fit rounded-md border border-line-strong bg-raised p-0.5">
			{options.map((option) => (
				<button
					key={option.value}
					type="button"
					role="radio"
					aria-checked={option.value === value}
					disabled={disabled || option.disabled}
					title={option.title}
					onClick={() => onChange(option.value)}
					className={cn(
						"h-8 rounded-sm px-3 text-sm transition-colors duration-(--duration-fast) disabled:cursor-not-allowed disabled:opacity-40",
						option.value === value ? "bg-pack text-pack-deep" : "text-paper-muted hover:text-paper",
					)}
				>
					{option.label}
				</button>
			))}
		</div>
	);
}
