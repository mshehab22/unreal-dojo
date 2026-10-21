// A flat placeholder shown while data loads. No shimmer: motion is for feedback and rewards only (A98).
import { cn } from "@/lib/utils";

/** Props for LoadingBlock. */
interface LoadingBlockProps
{
	readonly height?: string;
	readonly className?: string;
}

/** A quiet raised block the size of the content it stands in for. */
export function LoadingBlock({ height = "h-24", className }: LoadingBlockProps)
{
	return <div aria-busy="true" aria-label="Loading" data-testid="loading" className={cn("w-full rounded-lg border border-line bg-raised/40", height, className)} />;
}
