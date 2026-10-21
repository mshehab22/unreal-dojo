// Settings: engine and sandbox, loop mode, code review and the API key, and reset progress.
import { AppErrorView } from "@/components/AppErrorView";
import { LoadingBlock } from "@/components/LoadingBlock";
import { ScreenHeader } from "@/components/ScreenHeader";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoQuery } from "@/data/useDojoQuery";

import { EnginePanel } from "./settings/EnginePanel";
import { LoopPanel } from "./settings/LoopPanel";
import { ResetPanel } from "./settings/ResetPanel";
import { ReviewPanel } from "./settings/ReviewPanel";

/** Where the engine and sandbox live, how builds run, and who reviews your code. */
export function SettingsScreen()
{
	const settings = useDojoQuery(QUERY_KEYS.settings, (client) => client.getSettings());
	const environment = useDojoQuery(QUERY_KEYS.environment, (client) => client.getEnvironmentStatus());
	const providers = useDojoQuery(QUERY_KEYS.reviewProviders, (client) => client.getReviewProviders());

	return (
		<section data-testid="screen-settings" className="mx-auto flex w-full max-w-4xl flex-col gap-6">
			<ScreenHeader eyebrow="Settings" title="Settings" summary="Where the engine and sandbox live, how builds run, and who reviews your code." />
			{settings.error && !settings.data && <AppErrorView error={settings.error} onRetry={settings.reload} />}
			{!settings.data && !settings.error && <LoadingBlock height="h-96" />}
			{settings.data && (
				<>
					<EnginePanel settings={settings.data} environment={environment.data} />
					<LoopPanel settings={settings.data} environment={environment.data} />
					<ReviewPanel settings={settings.data} providers={providers.data} />
					<ResetPanel />
				</>
			)}
		</section>
	);
}
