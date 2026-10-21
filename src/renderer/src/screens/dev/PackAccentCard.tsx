// A pack accent sample: the accent, its soft and deep shades, and a button and badge drawn in it.
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCssVariable } from "@/hooks/useCssVariable";
import { PACK_ACCENTS, type PackId } from "@/styles/tokenCatalog";

/** Props for PackAccentCard. */
interface PackAccentCardProps
{
	readonly pack: PackId;
}

/** Shows one pack's accent family inside a data-pack wrapper, so the components pick it up. */
export function PackAccentCard({ pack }: PackAccentCardProps)
{
	const accent = PACK_ACCENTS[pack];
	const value = useCssVariable(`--color-${pack}`);

	return (
		<div data-pack={pack} data-testid={`pack-${pack}`} className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
			<div className="flex h-24 items-end bg-pack p-3">
				<span className="font-display text-xl font-bold text-pack-deep">{accent.label}</span>
			</div>
			<div className="grid grid-cols-2 border-b border-line">
				<div className="h-8 bg-pack-soft" title={`--color-${pack}-soft`} />
				<div className="h-8 bg-pack-deep" title={`--color-${pack}-deep`} />
			</div>
			<div className="flex flex-col gap-3 p-3">
				<div className="flex flex-col gap-0.5">
					<code className="font-mono text-xs text-paper">--color-{pack}</code>
					<code className="font-mono text-2xs text-paper-faint uppercase">
						{accent.hue} {value}
					</code>
					<span className="mt-1 text-xs text-paper-muted">{accent.purpose}</span>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="pack" size="sm">
						Start
					</Button>
					<Badge variant="pack">World 1</Badge>
				</div>
			</div>
		</div>
	);
}
