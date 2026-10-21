// shadcn/ui Badge, restyled with the Dojo tokens: small labels for states and packs.
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Class recipe for every badge variant. */
export const badgeVariants = cva(
	"inline-flex w-fit shrink-0 items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-2xs font-medium tracking-wide whitespace-nowrap uppercase [&_svg]:size-3",
	{
		variants: {
			variant: {
				neutral: "border-line-strong bg-raised text-paper-muted",
				pack: "border-pack/40 bg-pack-soft text-pack",
				pass: "border-pass/40 bg-pass/10 text-pass",
				fail: "border-fail/40 bg-fail/10 text-fail",
				warn: "border-warn/40 bg-warn/10 text-warn",
			},
		},
		defaultVariants: { variant: "neutral" },
	},
);

/** A short uppercase label. */
export function Badge({ className, variant, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>)
{
	return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}
