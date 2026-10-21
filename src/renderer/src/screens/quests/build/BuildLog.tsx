// The filtered build log of the last run, behind a toggle; open by default when the build failed.
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

/** Props for BuildLog. */
interface BuildLogProps
{
	readonly output: string;
	readonly startOpen: boolean;
}

/** A disclosure with the compiler output in mono, error lines in red. */
export function BuildLog({ output, startOpen }: BuildLogProps)
{
	const [open, setOpen] = useState(startOpen);

	return (
		<div data-testid="build-log" className="flex flex-col gap-2">
			<button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex items-center gap-1.5 self-start rounded-xs font-mono text-2xs tracking-widest text-paper-faint uppercase hover:text-paper focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
				<ChevronDownIcon className={cn("size-3.5 transition-transform duration-(--duration-fast)", !open && "-rotate-90")} />
				Build log
			</button>
			{open && (
				<pre className="max-h-48 overflow-auto rounded-md border border-line bg-ink p-2.5 font-mono text-2xs leading-relaxed whitespace-pre-wrap text-paper-muted select-text">
					{output.split("\n").map((line, index) => (
						<span key={index} className={cn("block", /error/i.test(line) && "text-fail", /warning/i.test(line) && "text-warn")}>
							{line}
						</span>
					))}
				</pre>
			)}
		</div>
	);
}
