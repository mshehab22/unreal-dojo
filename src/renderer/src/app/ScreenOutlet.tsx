// Picks the screen component for the current route.
import type { ComponentType } from "react";

import { CharacterScreen } from "@/screens/CharacterScreen";
import { CodexScreen } from "@/screens/CodexScreen";
import { FirstRunScreen } from "@/screens/FirstRunScreen";
import { TokenGalleryScreen } from "@/screens/dev/TokenGalleryScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { StudioScreen } from "@/screens/StudioScreen";
import { TitleScreen } from "@/screens/TitleScreen";
import { WorldMapScreen } from "@/screens/WorldMapScreen";

import type { RouteId } from "./router/routes";

/** The component that renders each route. */
const SCREENS: Readonly<Record<RouteId, ComponentType>> = {
	title: TitleScreen,
	studio: StudioScreen,
	worldMap: WorldMapScreen,
	character: CharacterScreen,
	codex: CodexScreen,
	settings: SettingsScreen,
	firstRun: FirstRunScreen,
	devTokens: TokenGalleryScreen,
};

/** Props for ScreenOutlet. */
interface ScreenOutletProps
{
	readonly routeId: RouteId;
}

/** Renders the screen for a route. */
export function ScreenOutlet({ routeId }: ScreenOutletProps)
{
	const Screen = SCREENS[routeId];

	return <Screen />;
}
