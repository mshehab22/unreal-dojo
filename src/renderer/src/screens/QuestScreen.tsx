// One quest, opened from the map, the Studio, or a loot screen's Next: loads it and shows the screen for its kind.
import { LockIcon } from "lucide-react";

import type { LearnerQuest } from "@shared/types/catalog";
import type { QuestAvailability } from "@shared/types/progress";

import { useNavigate, useRouteParameters } from "@/app/router/useRoute";
import { AppErrorView } from "@/components/AppErrorView";
import { LoadingBlock } from "@/components/LoadingBlock";
import { Panel } from "@/components/Panel";
import { Button } from "@/components/ui/button";
import { QUERY_KEYS, questKey } from "@/data/queryKeys";
import { useDojoQuery } from "@/data/useDojoQuery";

import { BreakdownQuestView } from "./quests/breakdown/BreakdownQuestView";
import { BuildQuestView } from "./quests/build/BuildQuestView";
import { ConceptQuestView } from "./quests/concept/ConceptQuestView";

/** The screen for a quest's kind. A boss opens on its breakdown, which is where a boss starts. */
function QuestByKind({ quest }: { readonly quest: LearnerQuest })
{
	switch (quest.kind)
	{
		case "concept":
			return <ConceptQuestView quest={quest} />;
		case "breakdown":
		case "boss":
			return <BreakdownQuestView quest={quest} />;
		case "build":
		case "refactor":
			return <BuildQuestView quest={quest} />;
	}
}

/** A locked quest says why, and offers the way back. */
function LockedQuest({ availability }: { readonly availability: QuestAvailability })
{
	const navigate = useNavigate();

	return (
		<Panel testId="quest-locked" className="mx-auto mt-16 max-w-lg items-start">
			<LockIcon className="size-6 text-paper-faint" />
			<h1 className="text-2xl font-bold">This quest is still locked</h1>
			<p className="text-paper-muted">{availability.lockedReason ?? "Its prerequisites are not passed yet."}</p>
			<Button variant="pack" onClick={() => navigate("worldMap")}>
				Back to the map
			</Button>
		</Panel>
	);
}

/** Reads `?id=` from the route, then the quest and its availability. Keyed by id, so moving to the next quest starts fresh. */
export function QuestScreen()
{
	const questId = useRouteParameters()["id"] ?? "";
	const quest = useDojoQuery(questKey(questId), (client) => client.getQuest(questId));
	const availability = useDojoQuery(QUERY_KEYS.availability, (client) => client.getQuestAvailability());
	const questAvailability = availability.data?.[questId];

	return (
		<section data-testid="screen-quest" data-quest={questId} data-kind={quest.data?.kind} className="mx-auto flex h-full w-full max-w-7xl flex-col">
			{quest.error && !quest.data && <AppErrorView error={quest.error} onRetry={quest.reload} />}
			{!quest.error && !(quest.data && availability.data) && <LoadingBlock height="h-96" />}
			{quest.data && availability.data && questAvailability?.status === "locked" && <LockedQuest availability={questAvailability} />}
			{quest.data && availability.data && questAvailability?.status !== "locked" && quest.data.id === questId && <QuestByKind key={questId} quest={quest.data} />}
		</section>
	);
}
