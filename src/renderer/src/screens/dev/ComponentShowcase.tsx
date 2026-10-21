// The base shadcn/ui components the frame uses, in every variant, for review against the tokens.
import { ArrowRightIcon, SearchIcon } from "lucide-react";

import { usePanelStore } from "@/app/usePanelStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Button, Badge, Input, Kbd, Separator, Tooltip, and Dialog samples. */
export function ComponentShowcase()
{
	const openCodexSearch = usePanelStore((state) => state.setCodexSearchOpen);

	return (
		<div className="flex flex-col gap-6 rounded-lg border border-line bg-surface p-6">
			<div className="flex flex-wrap items-center gap-3">
				<Button>Primary</Button>
				<Button variant="pack">
					Pack accent
					<ArrowRightIcon />
				</Button>
				<Button variant="secondary">Secondary</Button>
				<Button variant="outline">Outline</Button>
				<Button variant="ghost">Ghost</Button>
				<Button variant="destructive">Reset progress</Button>
				<Button disabled>Disabled</Button>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<Button size="sm" variant="secondary">
					Small
				</Button>
				<Button size="md" variant="secondary">
					Medium
				</Button>
				<Button size="lg" variant="secondary">
					Large
				</Button>
				<Button size="icon" variant="secondary" aria-label="Search">
					<SearchIcon />
				</Button>
			</div>

			<Separator />

			<div className="flex flex-wrap items-center gap-2">
				<Badge>Locked</Badge>
				<Badge variant="pack">Available</Badge>
				<Badge variant="pass">Passed</Badge>
				<Badge variant="fail">3 tests failed</Badge>
				<Badge variant="warn">Rematch due</Badge>
			</div>

			<Separator />

			<div className="grid grid-cols-2 gap-6">
				<Input placeholder="Sandbox folder, for example C:\Dojo" />
				<div className="flex items-center gap-3 text-sm text-paper-muted">
					<span className="flex gap-1">
						<Kbd>Ctrl</Kbd>
						<Kbd>K</Kbd>
					</span>
					<span>search</span>
					<Separator orientation="vertical" className="h-5" />
					<Kbd>Esc</Kbd>
					<span>close</span>
				</div>
			</div>

			<Separator />

			<div className="flex flex-wrap items-center gap-3">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button variant="outline">Hover for a tooltip</Button>
					</TooltipTrigger>
					<TooltipContent>Tooltips explain icons and locked states in a sentence.</TooltipContent>
				</Tooltip>
				<Button variant="outline" onClick={() => openCodexSearch(true)}>
					Open the dialog
				</Button>
			</div>
		</div>
	);
}
