// Shared builders for progress tests: local dates, quests, and a service on an in-memory disk.
import type { PlayerProgress } from "@shared/types/progress";

import { createNewProgress } from "../../src/main/services/progress/createNewProgress";
import { ProgressService } from "../../src/main/services/progress/ProgressService";
import { ProgressStore } from "../../src/main/services/progress/ProgressStore";
import type { RuleQuest } from "../../src/main/services/progress/RuleQuest";
import { FixedClock } from "./FixedClock";
import { MemoryFileSystem } from "./MemoryFileSystem";
import { SequenceRandom } from "./SequenceRandom";

/** A local-time moment (month is 1-based) so day boundaries are the learner's. */
export function localMoment(year: number, month: number, day: number, hour = 12, minute = 0): Date
{
	return new Date(year, month - 1, day, hour, minute);
}

/** A quest with sensible defaults; override any field. */
export function makeQuest(fields: Partial<RuleQuest> & { id: string }): RuleQuest
{
	return {
		title: fields.id,
		kind: "build",
		difficulty: 1,
		xp: 100,
		packId: "pack-1",
		packOrder: 1,
		worldId: "world-1",
		worldOrder: 1,
		order: 1,
		prerequisites: [],
		terms: [],
		patterns: [],
		skills: [],
		addsNewClass: false,
		...fields,
	};
}

/** A progress service on an in-memory disk with a fixed clock and fixed randomness. `prepare` may change the starting save. */
export function createTestProgressService(start: Date = localMoment(2026, 10, 21), random: number[] = [0], prepare?: (progress: PlayerProgress) => void): { service: ProgressService; clock: FixedClock; fileSystem: MemoryFileSystem; store: ProgressStore }
{
	const clock = new FixedClock(start);
	const fileSystem = new MemoryFileSystem();
	const store = new ProgressStore(fileSystem, "/user-data");
	const progress = createNewProgress(start);
	prepare?.(progress);
	const service = new ProgressService(progress, store, clock, new SequenceRandom(random));

	return { service, clock, fileSystem, store };
}
