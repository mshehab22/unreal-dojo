// One world as a client contract: the client's brief, progress, test-out, and the quest path with the boss at the end.
import { GraduationCapIcon } from "lucide-react";

import type { WorldOutline } from "@shared/types/catalog";
import type { QuestAvailability, WorldTestOutStatus } from "@shared/types/progress";

import { useNavigate } from "@/app/router/useRoute";
import { StudioPortrait } from "@/components/StudioPortrait";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { StagePath } from "./StagePath";

/** Props for ContractCard. */
interface ContractCardProps
{
	readonly packId: string;
	readonly world: WorldOutline;
	readonly availability: Readonly<Record<string, QuestAvailability>>;
	readonly testOut: WorldTestOutStatus | undefined;
	readonly rematchShare: number;
}

/** A world's contract card. Bosses can never be tested out of. */
export function ContractCard({ packId, world, availability, testOut, rematchShare }: ContractCardProps)
{
	const navigate = useNavigate();
	const passed = world.quests.filter((quest) => availability[quest.id]?.status === "passed").length;
	const isOpen = world.quests.some((quest) => availability[quest.id]?.status !== "locked");
	const skippable = world.quests.filter((quest) => availability[quest.id]?.skippable === true && availability[quest.id]?.status !== "passed").length;

	return (
		<article data-testid="contract-card" data-world={world.id} className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-5 shadow-raised">
			<div className="flex gap-4">
				<StudioPortrait role="client" size={48} className={isOpen ? "" : "opacity-50"} />
				<div className="flex min-w-0 flex-1 flex-col gap-1.5">
					<div className="flex flex-wrap items-center gap-2">
						<span className="font-mono text-2xs tracking-widest text-pack uppercase">Contract {world.order}</span>
						<Badge variant={passed === world.quests.length ? "pass" : "neutral"}>
							{passed} of {world.quests.length} passed
						</Badge>
						{testOut?.testedOut && (
							<Badge variant="pass" data-testid="tested-out-badge">
								Tested out{skippable > 0 ? `: ${skippable} ${skippable === 1 ? "quest" : "quests"} may be skipped` : ""}
							</Badge>
						)}
					</div>
					<h2 className="text-2xl font-semibold tracking-tight">{world.title}</h2>
					<p className="max-w-3xl text-sm text-paper-muted">{world.summary}</p>
				</div>
				<div className="flex shrink-0 flex-col items-end gap-1">
					{testOut?.eligible && !testOut.testedOut && (
						<Button variant="outline" size="sm" data-testid="test-out" onClick={() => navigate("drill", { kind: "test-out", pack: packId, world: world.id })}>
							<GraduationCapIcon />
							Test out
						</Button>
					)}
					{testOut && !testOut.eligible && !testOut.testedOut && testOut.reason && isOpen && <span className="max-w-40 text-right text-2xs text-paper-faint">{testOut.reason}</span>}
				</div>
			</div>
			<StagePath quests={world.quests} availability={availability} rematchShare={rematchShare} />
		</article>
	);
}
