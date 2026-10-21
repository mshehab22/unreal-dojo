// Wraps a disabled control so its reason still shows: the wrapper takes hover and keyboard focus, since a disabled button gets neither.
import type { ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Props for DisabledWithReason. */
interface DisabledWithReasonProps
{
	readonly reason: string;
	readonly children: ReactNode;
	readonly testId?: string;
}

/** A focusable span that is the tooltip trigger around a disabled button. */
export function DisabledWithReason({ reason, children, testId }: DisabledWithReasonProps)
{
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span data-testid={testId} tabIndex={0} aria-label={reason} className="inline-flex w-fit rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
					{children}
				</span>
			</TooltipTrigger>
			<TooltipContent>{reason}</TooltipContent>
		</Tooltip>
	);
}
