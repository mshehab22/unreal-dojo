// One motion track in the token gallery: a rail and a marker that slides with a given duration and easing.

/** Props for MotionTrack. */
interface MotionTrackProps
{
	readonly duration: string;
	readonly easing: string;
	readonly isAtEnd: boolean;
}

/** One rail with a marker that moves to the far end with the given timing. */
export function MotionTrack({ duration, easing, isAtEnd }: MotionTrackProps)
{
	return (
		<div className="relative h-6 rounded-pill bg-raised">
			<div
				className="absolute top-1 left-1 size-4 rounded-pill bg-pack"
				style={{
					left: isAtEnd ? "calc(100% - 1.25rem)" : "0.25rem",
					transitionProperty: "left",
					transitionDuration: duration,
					transitionTimingFunction: easing,
				}}
			/>
		</div>
	);
}
