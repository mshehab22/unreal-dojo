// One engine install as a selectable row: version, where it was found, its path, and how builds will run with it.
import type { EngineInstall } from "@shared/types/engine";

import { Badge } from "@/components/ui/badge";
import { describeLoop } from "@/lib/loopDescription";
import { isMacPlatform } from "@/lib/platform";
import { cn } from "@/lib/utils";

/** How each source is named. */
const SOURCE_LABELS: Readonly<Record<EngineInstall["source"], string>> = {
	launcher: "Epic launcher",
	"default-folder": "Default folder",
	registry: "Registry",
	manual: "Picked by you",
};

/** Props for EngineOption. */
interface EngineOptionProps
{
	readonly engine: EngineInstall;
	readonly isSelected: boolean;
	readonly onSelect: () => void;
}

/** A radio-like row for one install. */
export function EngineOption({ engine, isSelected, onSelect }: EngineOptionProps)
{
	const loop = describeLoop(engine, "auto", isMacPlatform());

	return (
		<button
			type="button"
			role="radio"
			aria-checked={isSelected}
			data-testid="engine-option"
			onClick={onSelect}
			className={cn(
				"flex w-full items-start gap-4 rounded-lg border p-4 text-left transition-colors duration-(--duration-fast)",
				isSelected ? "border-pack bg-pack-soft" : "border-line bg-raised/50 hover:border-line-strong",
			)}
		>
			<span className={cn("mt-1 flex size-4 shrink-0 items-center justify-center rounded-pill border", isSelected ? "border-pack" : "border-line-strong")}>
				{isSelected && <span className="size-2 rounded-pill bg-pack" />}
			</span>
			<span className="flex min-w-0 flex-1 flex-col gap-1">
				<span className="flex items-center gap-2">
					<span className="font-display text-lg font-semibold">UE {engine.version}</span>
					<Badge>{SOURCE_LABELS[engine.source]}</Badge>
					<Badge variant={loop.isFast ? "pass" : "neutral"}>{loop.label}</Badge>
				</span>
				<span className="truncate font-mono text-xs text-paper-faint">{engine.path}</span>
				<span className="text-xs text-paper-muted">{loop.detail}</span>
			</span>
		</button>
	);
}
