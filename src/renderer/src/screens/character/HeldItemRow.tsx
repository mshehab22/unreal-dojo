// One held item on the Character screen: icon, name, what it does, and how many are held against the cap.
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Props for HeldItemRow. */
interface HeldItemRowProps
{
	readonly icon: LucideIcon;
	readonly label: string;
	readonly count: number;
	readonly cap?: number;
	readonly note: string;
	readonly tone: string;
}

/** A row in the held items list; the icon is colored only while at least one is held. */
export function HeldItemRow({ icon: Icon, label, count, cap, note, tone }: HeldItemRowProps)
{
	return (
		<li className="flex items-center gap-3">
			<span className="flex size-9 items-center justify-center rounded-md border border-line bg-raised">
				<Icon className={cn("size-4", count > 0 ? tone : "text-line-strong")} strokeWidth={2} />
			</span>
			<span className="flex min-w-0 flex-1 flex-col leading-tight">
				<span className="text-sm text-paper">{label}</span>
				<span className="text-2xs text-paper-faint">{note}</span>
			</span>
			<span className="font-display text-lg font-bold tabular-nums">
				{count}
				{cap !== undefined && <span className="text-sm font-normal text-paper-faint"> / {cap}</span>}
			</span>
		</li>
	);
}
