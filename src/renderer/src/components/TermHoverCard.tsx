// A glossary term in running text: moving the pointer onto it or focusing it shows its short definition, with "Read more" (Codex) and "Drill me". Each open counts one hover.
import { HoverCard as HoverCardPrimitive } from "radix-ui";
import { useEffect, useState, type ReactNode } from "react";

import type { GlossaryEntry } from "@shared/types/content";

import { useNavigate } from "@/app/router/useRoute";
import { useCodexStore } from "@/app/useCodexStore";
import { dojo } from "@/data/activeClient";
import { useIntentionalHover } from "@/hooks/useIntentionalHover";
import { Button } from "@/components/ui/button";

/** How long the pointer rests on a term, after moving onto it, before the card opens. */
const OPEN_DELAY_MILLISECONDS = 250;

/** Props for TermHoverCard. */
interface TermHoverCardProps
{
	readonly entry: GlossaryEntry;
	readonly children: ReactNode;
}

/** The underlined term and its card. Opening records a hover (three on an unpassed term push it into the next drill). */
export function TermHoverCard({ entry, children }: TermHoverCardProps)
{
	const navigate = useNavigate();
	const selectTerm = useCodexStore((state) => state.selectTerm);
	const [queued, setQueued] = useState(false);
	const hover = useIntentionalHover(OPEN_DELAY_MILLISECONDS);

	// Counts one hover each time the card opens, whether the pointer or the keyboard opened it.
	useEffect(() =>
	{
		if (hover.open) void dojo().recordTermHover(entry.id).catch(() => undefined);
	}, [hover.open, entry.id]);

	/** Opens the term in the Codex. */
	const readMore = (): void =>
	{
		selectTerm(entry.id);
		navigate("codex");
	};

	/** Adds the term to the next drill. */
	const drillMe = (): void =>
	{
		void dojo().queueDrillItem(entry.id).then(() => setQueued(true), () => undefined);
	};

	return (
		<HoverCardPrimitive.Root open={hover.open} openDelay={OPEN_DELAY_MILLISECONDS} closeDelay={120} onOpenChange={hover.setOpen}>
			<HoverCardPrimitive.Trigger asChild>
				<span data-testid="glossary-term" data-term={entry.id} tabIndex={0} onPointerEnter={hover.onPointerEnter} onPointerMove={hover.onPointerMove} onPointerLeave={hover.onPointerLeave} className="cursor-help rounded-xs underline decoration-pack/60 decoration-dotted underline-offset-4 outline-none hover:decoration-pack focus-visible:ring-2 focus-visible:ring-ring">
					{children}
				</span>
			</HoverCardPrimitive.Trigger>
			<HoverCardPrimitive.Portal>
				<HoverCardPrimitive.Content data-testid="term-card" sideOffset={6} className="z-50 flex w-80 animate-fade-in flex-col gap-2 rounded-md border border-line-strong bg-overlay p-4 text-sm shadow-overlay">
					<div className="flex items-baseline justify-between gap-3">
						<span className="font-mono text-sm font-semibold text-pack">{entry.term}</span>
						<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">{entry.category}</span>
					</div>
					<p className="text-paper-muted">{entry.short}</p>
					<div className="flex gap-2 pt-1">
						<Button size="sm" variant="secondary" onClick={readMore}>
							Read more
						</Button>
						<Button size="sm" variant="ghost" onClick={drillMe} disabled={queued}>
							{queued ? "Queued for your next drill" : "Drill me"}
						</Button>
					</div>
				</HoverCardPrimitive.Content>
			</HoverCardPrimitive.Portal>
		</HoverCardPrimitive.Root>
	);
}
