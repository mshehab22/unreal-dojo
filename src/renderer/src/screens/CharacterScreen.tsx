// Character: placeholder until the character task.
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

/** The learner's level, role, cards, and skills. */
export function CharacterScreen()
{
	return (
		<PlaceholderScreen
			testId="screen-character"
			index={4}
			title="Character"
			summary="Who you are as a programmer so far: level, role, the patterns you have earned, and how well each skill has stuck."
			upcoming={[
				"Level, role, and XP bar",
				"Pattern card grid with tiers",
				"Skill tree with mastery",
				"Spree, streak, and milestones",
				"Attempt history",
				"Seer Stones and armor held",
			]}
		/>
	);
}
