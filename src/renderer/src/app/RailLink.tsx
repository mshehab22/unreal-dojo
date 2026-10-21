// One entry in the navigation rail: number, icon, and label, with the current pack's accent when active.
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Props for RailLink. */
interface RailLinkProps
{
	readonly href: string;
	readonly label: string;
	readonly index: number;
	readonly icon: LucideIcon;
	readonly isActive: boolean;
}

/** A rail entry that links to a route hash. */
export function RailLink({ href, label, index, icon: Icon, isActive }: RailLinkProps)
{
	return (
		<a
			href={href}
			aria-current={isActive ? "page" : undefined}
			className={cn(
				"group relative flex h-10 items-center gap-3 rounded-md pr-3 pl-4 text-sm font-medium transition-colors duration-(--duration-fast) ease-out",
				isActive ? "bg-raised text-paper" : "text-paper-muted hover:bg-raised/60 hover:text-paper",
			)}
		>
			<span
				aria-hidden="true"
				className={cn(
					"absolute top-2 bottom-2 left-0 w-[3px] rounded-r-pill bg-pack transition-opacity duration-(--duration-fast)",
					isActive ? "opacity-100" : "opacity-0",
				)}
			/>
			<Icon className={cn("size-4 shrink-0", isActive ? "text-pack" : "text-paper-faint group-hover:text-paper-muted")} strokeWidth={1.75} />
			<span className="flex-1">{label}</span>
			<span className={cn("font-mono text-2xs tabular-nums", isActive ? "text-pack" : "text-paper-faint")}>
				{String(index).padStart(2, "0")}
			</span>
		</a>
	);
}
