// The small cast of studio characters as flat vector portraits: the lead programmer (the learner), the client, and QA. Used sparingly.
import { cn } from "@/lib/utils";

/** Which character to draw. */
export type PortraitRole = "lead" | "client" | "qa";

/** Props for StudioPortrait. */
interface StudioPortraitProps
{
	readonly role: PortraitRole;
	readonly size?: number;
	readonly className?: string;
}

/** A round portrait: head, shoulders, and one prop that says who they are (headset, tie, clipboard). */
export function StudioPortrait({ role, size = 56, className }: StudioPortraitProps)
{
	return (
		<svg width={size} height={size} viewBox="0 0 56 56" role="img" aria-label={`${role} portrait`} className={cn("shrink-0", className)}>
			<circle cx="28" cy="28" r="27" className="fill-raised stroke-line-strong" strokeWidth="1" />
			<clipPath id={`portrait-clip-${role}`}>
				<circle cx="28" cy="28" r="27" />
			</clipPath>
			<g clipPath={`url(#portrait-clip-${role})`}>
				<path d="M8 56 C8 42 17 37 28 37 C39 37 48 42 48 56 Z" className={role === "client" ? "fill-overlay" : "fill-pack-soft"} />
				<circle cx="28" cy="24" r="10" className="fill-paper-muted" />
				{role === "lead" && (
					<>
						<path d="M18 22 C18 13 38 13 38 22" className="fill-none stroke-pack" strokeWidth="2.5" strokeLinecap="round" />
						<rect x="15.5" y="21" width="4" height="7" rx="2" className="fill-pack" />
						<rect x="36.5" y="21" width="4" height="7" rx="2" className="fill-pack" />
					</>
				)}
				{role === "client" && (
					<>
						<path d="M25 37 L28 47 L31 37 Z" className="fill-pack" />
						<path d="M19 18 C21 12 35 12 37 18 L37 20 L19 20 Z" className="fill-line-strong" />
					</>
				)}
				{role === "qa" && (
					<>
						<rect x="33" y="40" width="11" height="14" rx="1.5" className="fill-paper-faint" />
						<rect x="35.5" y="38.5" width="6" height="3" rx="1" className="fill-line-strong" />
						<rect x="21" y="22" width="14" height="4" rx="2" className="fill-none stroke-ink" strokeWidth="1.5" />
					</>
				)}
			</g>
		</svg>
	);
}
