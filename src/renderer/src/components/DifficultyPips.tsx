// Quest difficulty from 1 to 5 as five small bars.
import { cn } from "@/lib/utils";

/** Props for DifficultyPips. */
interface DifficultyPipsProps
{
	readonly difficulty: number;
}

/** Five bars, the first `difficulty` filled in the pack accent. */
export function DifficultyPips({ difficulty }: DifficultyPipsProps)
{
	return (
		<span className="flex items-end gap-0.5" aria-label={`Difficulty ${difficulty} of 5`} title={`Difficulty ${difficulty} of 5`}>
			{[1, 2, 3, 4, 5].map((step) => (
				<span key={step} className={cn("w-1 rounded-xs", step <= difficulty ? "bg-pack" : "bg-line-strong")} style={{ height: `${4 + step * 2}px` }} />
			))}
		</span>
	);
}
