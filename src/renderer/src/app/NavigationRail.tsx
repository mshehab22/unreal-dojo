// The left rail: brand, the screen list, and the Codex search entry point.
import { BookOpenIcon, FlagIcon, MapIcon, SearchIcon, SettingsIcon, UserRoundIcon, WarehouseIcon, type LucideIcon } from "lucide-react";

import { Kbd } from "@/components/ui/kbd";
import { activeDataSource } from "@/data/activeClient";
import { modifierKeyLabel } from "@/lib/platform";

import { BrandMark } from "./BrandMark";
import { RailLink } from "./RailLink";
import { hashForRoute, ROUTES, type RouteId } from "./router/routes";
import { usePanelStore } from "./usePanelStore";

/** The icon each screen shows in the rail. */
const ROUTE_ICONS: Readonly<Record<RouteId, LucideIcon>> = {
	title: FlagIcon,
	studio: WarehouseIcon,
	worldMap: MapIcon,
	character: UserRoundIcon,
	codex: BookOpenIcon,
	settings: SettingsIcon,
	firstRun: FlagIcon,
	quest: MapIcon,
	drill: WarehouseIcon,
	loot: MapIcon,
	devTokens: SettingsIcon,
};

/** The rail entry that stays lit on screens the rail does not list: quests and loot belong to the map, drills to the studio. */
const RAIL_PARENT: Partial<Readonly<Record<RouteId, RouteId>>> = {
	quest: "worldMap",
	loot: "worldMap",
	drill: "studio",
};

/** Props for NavigationRail. */
interface NavigationRailProps
{
	readonly activeRouteId: RouteId;
}

/** The fixed navigation rail on the left of every screen. */
export function NavigationRail({ activeRouteId }: NavigationRailProps)
{
	const openCodexSearch = usePanelStore((state) => state.setCodexSearchOpen);
	const railRoutes = ROUTES.filter((route) => route.showInRail);
	const dataSource = activeDataSource();

	return (
		<nav aria-label="Main" className="flex w-rail shrink-0 flex-col border-r border-line bg-surface">
			<div className="h-titlebar shrink-0" />

			<div className="flex items-center gap-3 px-5 pb-7">
				<BrandMark />
				<div className="leading-none">
					<div className="font-display text-lg font-bold tracking-tight">Unreal Dojo</div>
					<div className="mt-1 font-mono text-2xs tracking-widest text-paper-faint uppercase">C++ practice studio</div>
				</div>
			</div>

			<div className="flex flex-col gap-0.5 px-3">
				{railRoutes.map((route, position) => (
					<RailLink
						key={route.id}
						href={hashForRoute(route.id)}
						label={route.label}
						index={position + 1}
						icon={ROUTE_ICONS[route.id]}
						isActive={route.id === (RAIL_PARENT[activeRouteId] ?? activeRouteId)}
					/>
				))}
			</div>

			<div className="mt-auto flex flex-col gap-3 px-3 pb-4">
				{dataSource.kind === "fake" && (
					<div data-testid="fake-data-badge" title="Answers come from the typed fake DojoApi, not the main process (A240)." className="rounded-sm border border-dashed border-warn/50 px-2 py-1 text-center font-mono text-2xs tracking-widest text-warn uppercase">
						Fake data: {dataSource.scenario}
					</div>
				)}
				<button
					type="button"
					onClick={() => openCodexSearch(true)}
					data-testid="rail-codex-search"
					className="flex h-10 w-full items-center gap-2.5 rounded-md border border-line bg-ink/60 px-3 text-sm text-paper-faint transition-colors duration-(--duration-fast) hover:border-line-strong hover:text-paper-muted"
				>
					<SearchIcon className="size-4" strokeWidth={1.75} />
					<span className="flex-1 text-left">Search the Codex</span>
					<span className="flex gap-1">
						<Kbd>{modifierKeyLabel()}</Kbd>
						<Kbd>K</Kbd>
					</span>
				</button>
			</div>
		</nav>
	);
}
