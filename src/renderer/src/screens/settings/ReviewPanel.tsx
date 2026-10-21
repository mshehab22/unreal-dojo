// Settings: who reviews submitted code, each provider's availability, the API key (masked), the model id, and a Claude Code test.
import { CheckIcon, KeyRoundIcon, PlugZapIcon } from "lucide-react";
import { useState, type FormEvent } from "react";

import type { ReviewProviderStatus } from "@shared/types/review";
import type { ReviewProviderSetting, Settings } from "@shared/types/settings";

import { AppErrorView } from "@/components/AppErrorView";
import { Panel } from "@/components/Panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoAction } from "@/data/useDojoAction";
import { reviewProviderLabel } from "@/lib/reviewProviderLabel";
import { cn } from "@/lib/utils";

import { SegmentedControl } from "./SegmentedControl";
import { SettingRow } from "./SettingRow";

/** Props for ReviewPanel. */
interface ReviewPanelProps
{
	readonly settings: Settings;
	readonly providers: readonly ReviewProviderStatus[] | undefined;
}

/** What a stored key looks like on screen. The key itself never reaches the window. */
const MASKED_KEY = "sk-ant-••••••••••••••••";

/** Provider choice, availability list, key, model, and the test button. */
export function ReviewPanel({ settings, providers }: ReviewPanelProps)
{
	const refreshes = [QUERY_KEYS.settings, QUERY_KEYS.environment, QUERY_KEYS.reviewProviders] as const;
	const choose = useDojoAction((client, reviewProvider: ReviewProviderSetting) => client.updateSettings({ reviewProvider }), refreshes);
	const saveKey = useDojoAction((client, apiKey: string) => client.setApiKey(apiKey), refreshes);
	const clearKey = useDojoAction((client) => client.clearApiKey(), refreshes);
	const saveModel = useDojoAction((client, modelId: string) => client.updateSettings({ modelId }), [QUERY_KEYS.settings]);
	const testClaude = useDojoAction((client) => client.testClaudeCode(), [QUERY_KEYS.reviewProviders]);
	const [apiKey, setApiKey] = useState("");
	const [modelId, setModelId] = useState(settings.modelId);
	const [testResult, setTestResult] = useState<ReviewProviderStatus | null>(null);
	const keyError = saveKey.error ?? clearKey.error;

	/** Stores the typed key and clears the field. */
	const submitKey = async (event: FormEvent): Promise<void> =>
	{
		event.preventDefault();
		await saveKey.run(apiKey.trim());
		setApiKey("");
	};

	/** Runs the Claude Code test and keeps its answer. */
	const runTest = async (): Promise<void> =>
	{
		setTestResult((await testClaude.run()) ?? null);
	};

	return (
		<Panel title="Code review" testId="settings-review">
			<SettingRow label="Review provider" description="Auto uses the first available: Claude Code, then your API key, then tests only.">
				<SegmentedControl<ReviewProviderSetting>
					label="Review provider"
					value={settings.reviewProvider}
					onChange={(value) => void choose.run(value)}
					disabled={choose.isPending}
					options={[
						{ value: "auto", label: "Auto" },
						{ value: "claude-code", label: "Claude Code" },
						{ value: "anthropic-api", label: "API key" },
						{ value: "tests-only", label: "Tests only" },
					]}
				/>
				<ul data-testid="review-providers" className="flex flex-col gap-1">
					{(providers ?? []).map((provider) => (
						<li key={provider.id} className="flex items-center gap-2 text-xs">
							<span className={cn("size-2 rounded-pill", provider.available ? "bg-pass" : "bg-line-strong")} />
							<span className="text-paper">{reviewProviderLabel(provider.id)}</span>
							<span className="text-paper-faint">{provider.available ? (provider.version ?? "Available") : provider.reason}</span>
						</li>
					))}
				</ul>
				{choose.error && <AppErrorView error={choose.error} compact />}
			</SettingRow>
			<SettingRow label="Test Claude Code" description="Sends one tiny request through Claude Code to check it answers.">
				<div className="flex items-center gap-3">
					<Button variant="secondary" size="sm" onClick={runTest} disabled={testClaude.isPending}>
						<PlugZapIcon />
						{testClaude.isPending ? "Testing" : "Test Claude Code"}
					</Button>
					{testResult && (
						<span data-testid="claude-test-result" className={cn("flex items-center gap-1.5 text-xs", testResult.available ? "text-pass" : "text-fail")}>
							{testResult.available && <CheckIcon className="size-3.5" />}
							{testResult.available ? `Claude Code ${testResult.version ?? ""} answered.` : testResult.reason}
						</span>
					)}
				</div>
				{testClaude.error && <AppErrorView error={testClaude.error} compact />}
			</SettingRow>
			<SettingRow label="Anthropic API key" description="Stored encrypted on this computer. Only used when the API key provider reviews.">
				{settings.hasApiKey ? (
					<div className="flex items-center gap-3">
						<span data-testid="api-key-masked" className="font-mono text-sm text-paper-muted">
							{MASKED_KEY}
						</span>
						<Button variant="ghost" size="sm" onClick={() => void clearKey.run()} disabled={clearKey.isPending}>
							Remove
						</Button>
					</div>
				) : (
					<form onSubmit={submitKey} className="flex gap-2">
						<Input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Paste your key" aria-label="Anthropic API key" autoComplete="off" />
						<Button type="submit" variant="secondary" disabled={apiKey.trim().length === 0 || saveKey.isPending}>
							<KeyRoundIcon />
							Save
						</Button>
					</form>
				)}
				{keyError && <AppErrorView error={keyError} compact />}
			</SettingRow>
			<SettingRow label="Model" description="The model id the API key provider asks for.">
				<form
					className="flex gap-2"
					onSubmit={(event) =>
					{
						event.preventDefault();
						void saveModel.run(modelId.trim());
					}}
				>
					<Input value={modelId} onChange={(event) => setModelId(event.target.value)} aria-label="Model id" className="font-mono" autoComplete="off" />
					<Button type="submit" variant="secondary" disabled={modelId.trim() === settings.modelId || modelId.trim().length === 0 || saveModel.isPending}>
						Save
					</Button>
				</form>
				{saveModel.error && <AppErrorView error={saveModel.error} compact />}
			</SettingRow>
		</Panel>
	);
}
