// Studio home: placeholder until the studio task.
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

/** The learner's studio: what they have shipped and what to do today. */
export function StudioScreen()
{
	return (
		<PlaceholderScreen
			testId="screen-studio"
			index={2}
			title="Studio"
			summary="Your studio home. What you have shipped, what is due today, and where you left off."
			upcoming={[
				"Avatar and role",
				"Engine room with earned modules",
				"Shipped-titles wall",
				"Three daily quest offers",
				"Due drills with a start button",
				"Streak, freezes, and next due dates",
			]}
		/>
	);
}
