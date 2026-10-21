// The loot screen's score, counting up from zero once: the reward moment's one motion. Reduced motion shows the final number at once.
import { useEffect, useState } from "react";

/** Props for ScoreCountUp. */
interface ScoreCountUpProps
{
	readonly score: number;
	readonly passed: boolean;
}

/** The reward duration token in milliseconds, which is zero under reduced motion. */
function rewardDurationMs(): number
{
	const value = getComputedStyle(document.documentElement).getPropertyValue("--duration-reward").trim();

	return value.endsWith("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1000 || 0;
}

/** A large number that eases up to the score. */
export function ScoreCountUp({ score, passed }: ScoreCountUpProps)
{
	const [shown, setShown] = useState(0);

	useEffect(() =>
	{
		const duration = rewardDurationMs() * 1.5;

		if (duration <= 0)
		{
			setShown(score);
			return;
		}

		const start = performance.now();
		let frame = 0;

		/** One animation frame of the count. */
		const step = (now: number): void =>
		{
			const progress = Math.min(1, (now - start) / duration);
			const eased = 1 - Math.pow(1 - progress, 3);

			setShown(Math.round(score * eased));

			if (progress < 1) frame = requestAnimationFrame(step);
		};

		frame = requestAnimationFrame(step);

		return () => cancelAnimationFrame(frame);
	}, [score]);

	return (
		<div data-testid="loot-score" data-score={score} className="flex items-baseline gap-2">
			<span className={passed ? "font-display text-5xl leading-none font-bold text-pack tabular-nums" : "font-display text-5xl leading-none font-bold text-paper tabular-nums"}>{shown}</span>
			<span className="text-lg text-paper-faint">/ 100</span>
		</div>
	);
}
