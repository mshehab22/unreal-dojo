// Checks that every pack gate names worlds that exist and have a boss: a warning while the curriculum is being written, an error with --release (A68, A511).
import type { ContentProblem } from "../../../src/shared/types/content";
import { PACK_GATES, type PackGate } from "../../../src/main/services/progress/rules";
import type { ContentCheck } from "../ContentCheck";
import { errorAt, warningAt } from "./checkHelpers";

/** Builds the check for a list of gates; the verifier runs it with the app's PACK_GATES. */
export function createPackGateCheck(gates: readonly PackGate[]): ContentCheck
{
	return {
		name: "pack gates",
		run(input)
		{
			const problems: ContentProblem[] = [];

			// An empty content folder has no curriculum to gate.
			if (input.content.packs.length === 0) return problems;

			for (const gate of gates)
			{
				for (const world of gate.requiresBossOf)
				{
					const pack = input.content.packs.find((candidate) => candidate.id === world.packId);
					const found = pack?.worlds.find((candidate) => candidate.id === world.worldId);
					const file = pack ? `packs/${pack.id}/pack.json` : "packs";
					const gateName = `The Pack ${gate.packOrder} gate (src/main/services/progress/rules.ts)`;
					const reason = !pack
						? `names pack "${world.packId}", which does not exist yet`
						: !found
							? `names world "${world.worldId}" in pack "${world.packId}", which does not exist yet`
							: found.quests.some((quest) => quest.kind === "boss")
								? null
								: `names world "${world.worldId}" in pack "${world.packId}", which has no boss yet`;

					if (reason === null) continue;

					const message = `${gateName} ${reason}, so Pack ${gate.packOrder} stays locked`;
					problems.push(input.release ? errorAt(file, message, "pack gate") : warningAt(file, `${message} (warning until release; --release makes it an error)`, "pack gate"));
				}
			}

			return problems;
		},
	};
}

/** The pack gate check over the app's own gates. */
export const packGateCheck: ContentCheck = createPackGateCheck(PACK_GATES);
