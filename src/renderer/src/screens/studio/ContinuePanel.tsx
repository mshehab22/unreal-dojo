// The Studio's "continue" slot: the quest in progress touched most recently, or the next open one.
import { ArrowRightIcon } from "lucide-react";

import type { PlayerProgress, QuestAvailability } from "@shared/types/progress";

import { useNavigate } from "@/app/router/useRoute";
import { Panel } from "@/components/Panel";
import { QuestCard } from "@/components/QuestCard";
import { Button } from "@/components/ui/button";
import type { QuestLocation } from "@/lib/questIndex";

/** Props for ContinuePanel. */
interface ContinuePanelProps
{
	readonly progress: PlayerProgress;
	readonly availability: Readonly<Record<string, QuestAvailability>>;
	readonly quests: ReadonlyMap<string, QuestLocation>;
}

/** Picks the quest to continue: latest in progress, else the first open one in map order. */
function pickQuest(progress: PlayerProgress, availability: Readonly<Record<string, QuestAvailability>>, quests: ReadonlyMap<string, QuestLocation>): QuestLocation | null
{
	const inProgress = Object.entries(progress.quests)
		.filter(([, quest]) => quest.status === "in_progress")
		.sort(([, first], [, second]) => (second.lastAttemptAt ?? "").localeCompare(first.lastAttemptAt ?? ""));
	const latestId = inProgress[0]?.[0];

	if (latestId && quests.has(latestId)) return quests.get(latestId) ?? null;

	for (const [questId, location] of quests)
	{
		if (availability[questId]?.status === "available") return location;
	}

	return null;
}

/** The continue card. Opens the World Map until the quest screens exist. */
export function ContinuePanel({ progress, availability, quests }: ContinuePanelProps)
{
	const navigate = useNavigate();
	const location = pickQuest(progress, availability, quests);

	return (
		<Panel title={location && availability[location.quest.id]?.status === "in_progress" ? "Continue where you left off" : "Up next"} testId="studio-continue" className="col-span-5">
			{location ? (
				<div data-pack={location.pack.id}>
					<QuestCard
						quest={location.quest}
						availability={availability[location.quest.id]}
						context={`${location.pack.title}, ${location.world.title}`}
						action={
							<Button variant="pack" size="sm" className="self-start" onClick={() => navigate("worldMap")}>
								Open on the map
								<ArrowRightIcon />
							</Button>
						}
					/>
				</div>
			) : (
				<p className="text-sm text-paper-faint">Nothing open right now. The World Map shows what unlocks next.</p>
			)}
		</Panel>
	);
}
