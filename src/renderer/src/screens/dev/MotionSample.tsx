// Motion sample: one track per duration token; pressing Play slides every marker across with that duration.
import { PlayIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DURATIONS, EASINGS } from "@/styles/tokenCatalog";

import { MotionTrack } from "./MotionTrack";
import { TokenRow } from "./TokenRow";

/** Lets a reviewer see each duration and easing token move. */
export function MotionSample()
{
	const [isAtEnd, setIsAtEnd] = useState(false);

	return (
		<div className="flex flex-col gap-4">
			<Button variant="secondary" size="sm" className="w-fit" onClick={() => setIsAtEnd((current) => !current)}>
				<PlayIcon />
				Play
			</Button>
			<div className="rounded-lg border border-line bg-surface px-4">
				{DURATIONS.map((token) => (
					<TokenRow key={token.name} token={token}>
						<MotionTrack duration={`var(${token.name})`} easing="var(--ease-out)" isAtEnd={isAtEnd} />
					</TokenRow>
				))}
				{EASINGS.map((token) => (
					<TokenRow key={token.name} token={token}>
						<MotionTrack duration="var(--duration-reward)" easing={`var(${token.name})`} isAtEnd={isAtEnd} />
					</TokenRow>
				))}
			</div>
		</div>
	);
}
