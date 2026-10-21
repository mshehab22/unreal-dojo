// A Parsons reorder: shuffled lines (with distractors) on the left, the learner's order on the right. Click, keyboard, or drag to build it.
// Line ids follow A314: `line-<index>` for the block's lines in authored order, `distractor-<index>` for distractors.
import { ArrowDownIcon, ArrowUpIcon, XIcon } from "lucide-react";
import { useState, type DragEvent, type KeyboardEvent } from "react";

import type { ParsonsBlock } from "@shared/types/content";

import { Button } from "@/components/ui/button";
import { shuffledOrder } from "@/lib/presentationOrder";
import { cn } from "@/lib/utils";

import { misplacedLineIds } from "./parsonsPlacement";

/** One line the learner can place. */
interface ParsonsLine
{
	id: string;
	text: string;
	mistake?: string;
}

/** Props for ParsonsInput. */
interface ParsonsInputProps
{
	readonly block: ParsonsBlock;
	readonly order: readonly string[];
	readonly onChange: (lineIds: string[]) => void;
	readonly disabled?: boolean;

	/** True once graded: distractors and misplaced lines are marked, and the right order is shown. */
	readonly revealed?: boolean;
}

/** Every line of the block, distractors included, keyed by id. */
function linesOf(block: ParsonsBlock): ParsonsLine[]
{
	return [
		...block.lines.map((text, index) => ({ id: `line-${index}`, text })),
		...block.distractors.map((distractor, index) => ({ id: `distractor-${index}`, text: distractor.line, mistake: distractor.mistake })),
	];
}

/** Moves one id inside a list; out of range moves are ignored. */
function moved(order: readonly string[], from: number, to: number): string[]
{
	if (to < 0 || to >= order.length) return [...order];

	const next = [...order];
	const [id] = next.splice(from, 1);

	if (id !== undefined) next.splice(to, 0, id);

	return next;
}

/** Shows the pool and the answer list; every move works by click, by keyboard (Enter adds, Alt+Up and Alt+Down move, Delete removes), and by drag. */
export function ParsonsInput({ block, order, onChange, disabled = false, revealed = false }: ParsonsInputProps)
{
	const lines = linesOf(block);
	const byId = new Map(lines.map((line) => [line.id, line]));
	const [poolOrder] = useState(() => shuffledOrder(lines.length).map((index) => lines[index]?.id ?? ""));
	const [dragged, setDragged] = useState<string | null>(null);
	const pool = poolOrder.filter((id) => !order.includes(id));

	/** Adds a line at the end, or at a position when dropped there. */
	const place = (id: string, position = order.length): void =>
	{
		const without = order.filter((placed) => placed !== id);

		onChange([...without.slice(0, position), id, ...without.slice(position)]);
	};

	/** Takes a line back to the pool. */
	const remove = (id: string): void => onChange(order.filter((placed) => placed !== id));

	/** Keyboard moves on a placed line. */
	const onPlacedKey = (event: KeyboardEvent, index: number, id: string): void =>
	{
		if (disabled) return;

		if (event.altKey && event.key === "ArrowUp")
		{
			event.preventDefault();
			onChange(moved(order, index, index - 1));
		}
		else if (event.altKey && event.key === "ArrowDown")
		{
			event.preventDefault();
			onChange(moved(order, index, index + 1));
		}
		else if (event.key === "Delete" || event.key === "Backspace")
		{
			event.preventDefault();
			remove(id);
		}
	};

	/** Drops a dragged line into the answer at a position. */
	const dropAt = (event: DragEvent, position: number): void =>
	{
		event.preventDefault();
		event.stopPropagation();

		if (dragged && !disabled) place(dragged, position);

		setDragged(null);
	};

	const misplaced = revealed ? misplacedLineIds(order, (id) => byId.get(id)?.text, block.lines) : new Set<string>();

	return (
		<div data-testid="parsons" className="grid grid-cols-2 gap-4">
			<div className="flex min-w-0 flex-col gap-2">
				<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">Lines ({pool.length})</span>
				<ul
					className="flex min-h-24 flex-col gap-1.5 rounded-md border border-dashed border-line p-2"
					onDragOver={(event) => event.preventDefault()}
					onDrop={(event) =>
					{
						event.preventDefault();
						if (dragged && !disabled) remove(dragged);
						setDragged(null);
					}}
				>
					{pool.map((id) => (
						<li key={id}>
							<button
								type="button"
								data-testid="parsons-pool-line"
								data-line-id={id}
								draggable={!disabled}
								disabled={disabled}
								onDragStart={() => setDragged(id)}
								onClick={() => place(id)}
								aria-label={`Add line: ${byId.get(id)?.text.trim()}`}
								className={cn("w-full cursor-grab overflow-x-auto rounded-sm border border-line bg-raised px-2.5 py-1.5 text-left font-mono text-xs whitespace-pre text-paper hover:border-pack focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", revealed && id.startsWith("distractor-") && "border-fail/60 line-through decoration-fail/70")}
							>
								{byId.get(id)?.text}
							</button>
						</li>
					))}
					{pool.length === 0 && <li className="px-1 py-2 text-xs text-paper-faint">Every line is placed.</li>}
				</ul>
			</div>

			<div className="flex min-w-0 flex-col gap-2">
				<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">Your order</span>
				<ol aria-label="Your order" className="flex min-h-24 flex-col gap-1.5 rounded-md border border-line bg-ink p-2" onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropAt(event, order.length)}>
					{order.map((id, index) =>
					{
						const line = byId.get(id);
						const wrong = misplaced.has(id);

						return (
							<li key={id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropAt(event, index)} className="flex flex-col gap-1">
								<div
									data-testid="parsons-placed-line"
									data-line-id={id}
									data-wrong={wrong}
									tabIndex={disabled ? -1 : 0}
									draggable={!disabled}
									onDragStart={() => setDragged(id)}
									onKeyDown={(event) => onPlacedKey(event, index, id)}
									aria-label={`Line ${index + 1}: ${line?.text.trim()}. Alt and arrow keys move it, Delete removes it.`}
									className={cn("group flex items-center gap-2 rounded-sm border px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring", wrong ? "border-fail/60 bg-fail/10" : revealed ? "border-pass/50 bg-pass/5" : "border-line-strong bg-raised")}
								>
									<span className="w-4 shrink-0 text-right font-mono text-2xs text-paper-faint">{index + 1}</span>
									<span className="min-w-0 flex-1 overflow-x-auto font-mono text-xs whitespace-pre text-paper">{line?.text}</span>
									{!disabled && (
										<span className="flex shrink-0 gap-0.5">
											<Button type="button" size="icon" variant="ghost" className="size-6" aria-label="Move up" tabIndex={-1} onClick={() => onChange(moved(order, index, index - 1))}>
												<ArrowUpIcon />
											</Button>
											<Button type="button" size="icon" variant="ghost" className="size-6" aria-label="Move down" tabIndex={-1} onClick={() => onChange(moved(order, index, index + 1))}>
												<ArrowDownIcon />
											</Button>
											<Button type="button" size="icon" variant="ghost" className="size-6" aria-label="Remove" tabIndex={-1} onClick={() => remove(id)}>
												<XIcon />
											</Button>
										</span>
									)}
								</div>
								{revealed && line?.mistake && <p className="pl-6 text-xs text-fail">{line.mistake}</p>}
							</li>
						);
					})}
					{order.length === 0 && <li className="px-1 py-2 text-xs text-paper-faint">Click or drag lines here, top to bottom.</li>}
				</ol>
				{revealed && (
					<div className="flex flex-col gap-1">
						<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">The order that works</span>
						<pre className="overflow-x-auto rounded-md border border-line bg-ink p-2 font-mono text-xs text-paper">{block.lines.join("\n")}</pre>
					</div>
				)}
			</div>
		</div>
	);
}
