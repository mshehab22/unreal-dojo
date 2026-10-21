// The fake's packs, worlds, and quests, with each quest's standing for a learner part way through.
import type { QuestStatus } from "@shared/types/progress";

import type { QuestSeed } from "./questFactory";

/** One quest on the map with where the returning learner stands on it. */
export interface StageFixture extends QuestSeed
{
	status: QuestStatus;
	lockedReason?: string;
	dueForRematch?: boolean;
	bestScore?: number;
}

/** One world: a client contract and its stages. */
export interface WorldFixture
{
	id: string;
	title: string;
	summary: string;
	stages: StageFixture[];
}

/** One pack (a region on the map). */
export interface PackFixture
{
	id: string;
	title: string;
	summary: string;
	worlds: WorldFixture[];
}

/** The four packs, a few worlds each, enough to show every stage state. */
export const MAP_FIXTURE: PackFixture[] = [
	{
		id: "foundations",
		title: "Unreal C++ Foundations",
		summary: "Objects, memory, containers, the gameplay framework, and how Unreal code talks to itself.",
		worlds: [
			{
				id: "foundations.objects",
				title: "Objects and reflection",
				summary: "Brightline Games is building a night market and needs lanterns a designer can tune without touching code. Every value they ask for must show up in the editor, and the lanterns must flicker on their own once placed.",
				stages: [
					{ id: "foundations.objects.uproperty", title: "UPROPERTY puts a field in the editor", kind: "concept", difficulty: 1, xp: 20, minutes: 6, terms: ["uproperty", "reflection", "editanywhere"], skills: ["ue.objects.uproperty"], status: "passed", bestScore: 100 },
					{ id: "foundations.objects.uclass", title: "UCLASS and the generated header", kind: "concept", difficulty: 1, xp: 20, minutes: 5, terms: ["uclass", "generated-body", "unreal-header-tool"], skills: ["ue.objects.uclass"], status: "passed", bestScore: 80 },
					{ id: "foundations.objects.lantern", title: "A lantern with tunable brightness", kind: "build", scaffold: "worked", difficulty: 1, xp: 60, minutes: 20, terms: ["uproperty", "actor"], skills: ["ue.objects.uproperty", "ue.objects.actors"], status: "passed", bestScore: 92 },
					{ id: "foundations.objects.flicker", title: "Flicker on a timer", kind: "build", scaffold: "faded", difficulty: 2, xp: 80, minutes: 25, terms: ["timer-manager", "timer-handle"], skills: ["ue.objects.actors"], patterns: ["update-method"], status: "passed", bestScore: 74, dueForRematch: true },
					{ id: "foundations.objects.switch-plan", title: "Plan the lantern switch", kind: "breakdown", difficulty: 2, xp: 70, minutes: 12, skills: ["breakdown.decompose"], status: "passed", bestScore: 85 },
					{ id: "foundations.objects.switch", title: "Lantern switch", kind: "build", scaffold: "stub", difficulty: 2, xp: 90, minutes: 30, terms: ["ufunction", "blueprintcallable"], skills: ["ue.objects.ufunction"], status: "passed", bestScore: 88 },
					{ id: "foundations.objects.proximity", title: "Proximity lantern", kind: "build", scaffold: "blank", difficulty: 3, xp: 120, minutes: 40, terms: ["overlap-event", "sphere-component"], skills: ["ue.objects.actors", "ue.collision.overlaps"], patterns: ["component"], status: "passed", bestScore: 81 },
					{ id: "foundations.objects.boss", title: "Boss: Night market lights", kind: "boss", difficulty: 3, xp: 300, minutes: 90, skills: ["breakdown.integrate"], patterns: ["component", "observer"], status: "passed", bestScore: 78 },
				],
			},
			{
				id: "foundations.memory",
				title: "Memory and ownership",
				summary: "Driftwood Interactive keeps crashing when enemies despawn mid-fight. They want a spawner that cleans up after itself and never holds a pointer to something the garbage collector already took.",
				stages: [
					{ id: "foundations.memory.tobjectptr", title: "TObjectPtr and the garbage collector", kind: "concept", difficulty: 2, xp: 25, minutes: 6, terms: ["tobjectptr", "garbage-collection"], skills: ["ue.memory.gc"], status: "passed", bestScore: 100 },
					{ id: "foundations.memory.weak", title: "Weak pointers that let go", kind: "concept", difficulty: 2, xp: 25, minutes: 6, terms: ["tweakobjectptr", "isvalid"], skills: ["ue.memory.weak"], status: "passed", bestScore: 80 },
					{ id: "foundations.memory.target", title: "A turret that forgets dead targets", kind: "build", scaffold: "worked", difficulty: 2, xp: 80, minutes: 25, terms: ["tweakobjectptr"], skills: ["ue.memory.weak"], status: "passed", bestScore: 90 },
					{ id: "foundations.memory.soft-mesh", title: "Soft-load the lantern mesh", kind: "build", scaffold: "faded", difficulty: 3, xp: 100, minutes: 30, terms: ["tsoftobjectptr"], skills: ["ue.memory.soft-refs"], status: "in_progress" },
					{ id: "foundations.memory.spawner-plan", title: "Plan the spawner cleanup", kind: "breakdown", difficulty: 3, xp: 90, minutes: 15, skills: ["breakdown.decompose"], status: "available" },
					{ id: "foundations.memory.spawner", title: "Spawner that cleans up", kind: "build", scaffold: "stub", difficulty: 3, xp: 120, minutes: 35, terms: ["spawnactor", "endplay"], skills: ["ue.memory.ownership"], status: "locked", lockedReason: "Pass Soft-load the lantern mesh and Plan the spawner cleanup first." },
					{ id: "foundations.memory.boss", title: "Boss: The wave that never leaks", kind: "boss", difficulty: 4, xp: 350, minutes: 100, skills: ["breakdown.integrate"], patterns: ["object-pool"], status: "locked", lockedReason: "Pass every quest in Memory and ownership first." },
				],
			},
			{
				id: "foundations.containers",
				title: "Containers and strings",
				summary: "Pocketwatch Studio needs a loot table and a chat log that can take a thousand lines a minute without stalling the game thread.",
				stages: [
					{ id: "foundations.containers.tarray", title: "TArray without surprises", kind: "concept", difficulty: 2, xp: 25, minutes: 6, terms: ["tarray"], skills: ["ue.containers.tarray"], status: "locked", lockedReason: "Finish Memory and ownership first." },
					{ id: "foundations.containers.tmap", title: "TMap for the loot table", kind: "build", scaffold: "worked", difficulty: 2, xp: 80, minutes: 25, terms: ["tmap"], skills: ["ue.containers.tmap"], status: "locked", lockedReason: "Pass TArray without surprises first." },
					{ id: "foundations.containers.boss", title: "Boss: The chat log", kind: "boss", difficulty: 4, xp: 350, minutes: 100, status: "locked", lockedReason: "Pass every quest in Containers and strings first." },
				],
			},
		],
	},
	{
		id: "patterns",
		title: "Patterns in Unreal",
		summary: "The game programming patterns, each in its Unreal form, with when not to use it.",
		worlds: [
			{
				id: "patterns.lens",
				title: "The architecture lens",
				summary: "Hollow Oak Games has a prototype nobody dares to change. Before any pattern, they want you to explain what makes code easy to change and what that costs.",
				stages: [
					{ id: "patterns.lens.decoupling", title: "What decoupling buys and costs", kind: "concept", difficulty: 1, xp: 20, minutes: 6, skills: ["patterns.lens"], status: "passed", bestScore: 100 },
					{ id: "patterns.lens.prototype-plan", title: "Plan the prototype rescue", kind: "breakdown", difficulty: 2, xp: 70, minutes: 15, skills: ["breakdown.decompose", "design.coupling"], status: "available" },
				],
			},
			{
				id: "patterns.time",
				title: "Time",
				summary: "Tidewater Labs wants a day and night cycle that never stutters, even when the frame rate does.",
				stages: [
					{ id: "patterns.time.game-loop", title: "The game loop you never write", kind: "concept", difficulty: 2, xp: 25, minutes: 6, patterns: ["game-loop"], status: "locked", lockedReason: "Pass Plan the prototype rescue first." },
					{ id: "patterns.time.update-method", title: "Update Method with Tick", kind: "build", scaffold: "worked", difficulty: 2, xp: 80, minutes: 25, patterns: ["update-method"], status: "locked", lockedReason: "Pass The game loop you never write first." },
				],
			},
		],
	},
	{
		id: "mechanics",
		title: "Mechanics Lab",
		summary: "Input, movement, collision, spawning, and tracing, one small mechanic at a time.",
		worlds: [
			{
				id: "mechanics.input",
				title: "Enhanced Input",
				summary: "Kestrel Arcade has a jetpack prototype and three different control schemes. They want one input setup that can switch between them at runtime.",
				stages: [
					{ id: "mechanics.input.actions", title: "Input actions and mapping contexts", kind: "concept", difficulty: 2, xp: 25, minutes: 6, terms: ["enhanced-input", "input-action", "input-mapping-context"], skills: ["ue.input.actions"], status: "available" },
					{ id: "mechanics.input.jetpack", title: "Bind the jetpack", kind: "build", scaffold: "worked", difficulty: 2, xp: 80, minutes: 25, terms: ["enhanced-input-component"], skills: ["ue.input.actions"], status: "locked", lockedReason: "Pass Input actions and mapping contexts first." },
				],
			},
		],
	},
	{
		id: "systems",
		title: "Systems Lab",
		summary: "Breakdown-first: inventory, abilities, saving, interaction, spawning, and AI.",
		worlds: [
			{
				id: "systems.inventory",
				title: "Inventory and equipment",
				summary: "Ironbark Games wants an inventory that designers fill from data, with equipment that changes the character's stats.",
				stages: [
					{ id: "systems.inventory.plan", title: "Plan the inventory", kind: "breakdown", difficulty: 4, xp: 120, minutes: 20, status: "locked", lockedReason: "Unlocks after Foundations world 5 and Patterns world 4." },
					{ id: "systems.inventory.boss", title: "Boss: The armory", kind: "boss", difficulty: 5, xp: 400, minutes: 120, status: "locked", lockedReason: "Unlocks after Foundations world 5 and Patterns world 4." },
				],
			},
		],
	},
];
