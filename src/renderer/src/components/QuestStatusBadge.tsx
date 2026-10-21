// A quest's state as a badge: locked, available, in progress, passed, or due for a rematch.
import type { QuestAvailability } from "@shared/types/progress";

import { Badge } from "@/components/ui/badge";

/** Props for QuestStatusBadge. */
interface QuestStatusBadgeProps
{
	readonly availability: QuestAvailability | undefined;
}

/** The badge for a quest's availability; a rematch wins over passed. */
export function QuestStatusBadge({ availability }: QuestStatusBadgeProps)
{
	if (!availability) return <Badge>Unknown</Badge>;

	if (availability.dueForRematch) return <Badge variant="warn">Rematch due</Badge>;

	switch (availability.status)
	{
		case "passed":
			return <Badge variant="pass">Passed</Badge>;
		case "in_progress":
			return <Badge variant="pack">In progress</Badge>;
		case "available":
			return <Badge variant="pack">Open</Badge>;
		case "locked":
			return <Badge>Locked</Badge>;
	}
}
