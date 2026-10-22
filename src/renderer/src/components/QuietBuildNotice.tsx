// Shown while a build has produced no new output for a while: how long, whether main says it is still running, and a status check.
import { RefreshCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SandboxBuild } from "@/data/useSandboxBuild";
import { formatElapsed } from "@/lib/formatting";
import { cn } from "@/lib/utils";

/** Props for QuietBuildNotice. */
interface QuietBuildNoticeProps
{
	readonly build: Pick<SandboxBuild, "silentForMs" | "isConfirmedRunning" | "isUnreachable" | "isChecking" | "checkStatus">;
}

/** The sentence for the notice: unreachable, confirmed alive but silent, or not yet confirmed. */
function noticeText(build: QuietBuildNoticeProps["build"]): string
{
	const silence = formatElapsed(build.silentForMs);

	if (build.isUnreachable) return `The app cannot get an answer about the build (${silence} without output). If this stays, restart Unreal Dojo.`;
	if (build.isConfirmedRunning) return `Still running; no new output for ${silence}. Unreal can be quiet while it waits for another build to finish or works on a big file.`;

	return `No word from the build for ${silence}. The app is checking on it.`;
}

/** A calm note with a "Check status" button. The app also checks on its own every 15 seconds while the build stays quiet (A822). */
export function QuietBuildNotice({ build }: QuietBuildNoticeProps)
{
	return (
		<div
			data-testid="quiet-build"
			data-confirmed={build.isConfirmedRunning}
			data-unreachable={build.isUnreachable}
			className={cn("flex items-center justify-between gap-4 rounded-lg border p-3 text-sm", build.isUnreachable ? "border-warn/40 bg-warn/[0.06] text-paper" : "border-line bg-raised/50 text-paper-muted")}
		>
			<span>{noticeText(build)}</span>
			<Button variant="secondary" size="sm" onClick={build.checkStatus} disabled={build.isChecking} className="shrink-0">
				<RefreshCwIcon />
				{build.isChecking ? "Checking" : "Check status"}
			</Button>
		</div>
	);
}
