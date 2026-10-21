// Title screen: the wordmark, the learner's name, continue or start setup, and the environment chips.
import type { ReactNode } from "react";

import { useNavigate } from "@/app/router/useRoute";
import { AppErrorView } from "@/components/AppErrorView";
import { LoadingBlock } from "@/components/LoadingBlock";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoQuery } from "@/data/useDojoQuery";
import { levelStanding } from "@/lib/levels";
import { PACK_ACCENTS, PACK_IDS } from "@/styles/tokenCatalog";

import { EnvironmentChips } from "./title/EnvironmentChips";
import { FreshStart } from "./title/FreshStart";
import { ReturningStart } from "./title/ReturningStart";

/** The first screen the learner sees. A learner who never finished setup is sent to First-run from here. */
export function TitleScreen()
{
	const navigate = useNavigate();
	const version = useDojoQuery(QUERY_KEYS.appVersion, (client) => client.getAppVersion());
	const settings = useDojoQuery(QUERY_KEYS.settings, (client) => client.getSettings());
	const progress = useDojoQuery(QUERY_KEYS.progress, (client) => client.getProgress());
	const rules = useDojoQuery(QUERY_KEYS.rules, (client) => client.getRules());

	/** The start block: nothing is offered until settings say whether setup ran. */
	const start = (): ReactNode =>
	{
		if (!settings.data && settings.error) return <AppErrorView error={settings.error} onRetry={settings.reload} />;
		if (!settings.data) return <LoadingBlock height="h-12" className="max-w-xl" />;

		if (settings.data.firstRunCompletedAt === null)
		{
			// Remounts once progress arrives, so the name field starts with the saved name.
			return <FreshStart key={progress.data ? "loaded" : "loading"} initialName={progress.data?.playerName ?? ""} onReady={() => navigate("firstRun")} />;
		}

		return <ReturningStart progress={progress.data} role={progress.data && rules.data ? levelStanding(progress.data.xp, rules.data).role : null} onContinue={() => navigate("studio")} />;
	};

	return (
		<section data-testid="screen-title" className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-center gap-10 py-6">
			<div className="flex flex-col gap-5">
				<div className="flex items-center gap-3 font-mono text-xs tracking-widest text-paper-faint uppercase">
					<span className="text-pack">Unreal Engine 5</span>
					<span className="h-px w-8 bg-line-strong" />
					<span>C++ by practice</span>
				</div>
				<h1 className="text-[5.5rem] leading-[0.92] font-extrabold tracking-[-0.035em]">Unreal Dojo</h1>
				<p className="max-w-xl text-xl text-paper-muted">
					Learn Unreal Engine C++ by practicing. Plan the mechanic, write the code, ship it to your studio.
				</p>
			</div>

			<div className="flex flex-col gap-3">
				{start()}
				<p data-testid="app-version" className="font-mono text-xs text-paper-faint">
					{version.data ? `v${version.data}` : ""}
				</p>
			</div>

			<EnvironmentChips />

			<div className="grid grid-cols-4 gap-2">
				{PACK_IDS.map((pack) => (
					<div key={pack} data-pack={pack} className="flex flex-col gap-2">
						<div className="h-1 rounded-pill bg-pack" />
						<div className="font-mono text-2xs tracking-widest text-pack uppercase">{PACK_ACCENTS[pack].label}</div>
					</div>
				))}
			</div>
		</section>
	);
}
