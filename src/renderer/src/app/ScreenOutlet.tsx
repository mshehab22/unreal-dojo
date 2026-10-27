// Picks the screen component for the current route and keeps a crashing screen from taking the frame down with it.
import type { ComponentType } from "react";

import { ScreenErrorBoundary } from "@/components/ScreenErrorBoundary";
import { CharacterScreen } from "@/screens/CharacterScreen";
import { CodexScreen } from "@/screens/CodexScreen";
import { DrillScreen } from "@/screens/DrillScreen";
import { FirstRunScreen } from "@/screens/FirstRunScreen";
import { LootScreen } from "@/screens/LootScreen";
import { QuestScreen } from "@/screens/QuestScreen";
import { TokenGalleryScreen } from "@/screens/dev/TokenGalleryScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { StudioScreen } from "@/screens/StudioScreen";
import { TitleScreen } from "@/screens/TitleScreen";
import { WorldMapScreen } from "@/screens/WorldMapScreen";

import type { RouteId } from "./router/routes";
import { useNavigate } from "./router/useRoute";

/** The component that renders each route. */
const SCREENS: Readonly<Record<RouteId, ComponentType>> = {
	title: TitleScreen,
	studio: StudioScreen,
	worldMap: WorldMapScreen,
	character: CharacterScreen,
	codex: CodexScreen,
	settings: SettingsScreen,
	firstRun: FirstRunScreen,
	quest: QuestScreen,
	drill: DrillScreen,
	loot: LootScreen,
	devTokens: TokenGalleryScreen,
};

/** Props for ScreenOutlet. */
interface ScreenOutletProps
{
	readonly routeId: RouteId;
}

/** Renders the screen for a route inside an error boundary that resets whenever the route changes. */
export function ScreenOutlet({ routeId }: ScreenOutletProps)
{
	const Screen = SCREENS[routeId];
	const navigate = useNavigate();

	return (
		<ScreenErrorBoundary key={routeId} onGoToStudio={() => navigate("studio")}>
			<Screen />
		</ScreenErrorBoundary>
	);
}
