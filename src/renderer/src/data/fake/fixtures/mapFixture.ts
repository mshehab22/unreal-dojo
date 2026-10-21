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
				// Shaped like the real Pack 1 World 1 (12 stages, real titles), so the World Map's layout is tested at real lengths (A390).
				id: "objects-and-reflection",
				title: "Objects and reflection",
				summary: "A training yard client wants targets their designers can tune without a programmer. Learn how UObjects, actors, and the reflection macros let the editor, Blueprint, and the console see your C++.",
				stages: [
					{ id: "f1-uobject-and-actor", title: "UObjects, actors, and the class default object", kind: "concept", difficulty: 1, xp: 20, minutes: 5, terms: ["uobject", "actor", "cdo"], skills: ["ue.objects.uobject"], status: "passed", bestScore: 100 },
					{ id: "f1-reflection-and-uclass", title: "Reflection, UCLASS, and the generated header", kind: "concept", difficulty: 1, xp: 20, minutes: 6, terms: ["uclass", "generated-body", "unreal-header-tool"], skills: ["ue.objects.uclass"], status: "passed", bestScore: 80 },
					{ id: "f1-uproperty-specifiers", title: "UPROPERTY specifiers decide who can see and change a field", kind: "concept", difficulty: 1, xp: 25, minutes: 6, terms: ["uproperty", "editanywhere", "blueprintreadwrite"], skills: ["ue.objects.uproperty"], status: "passed", bestScore: 100 },
					{ id: "f1-ufunction-specifiers", title: "UFUNCTION opens a function to Blueprint and the console", kind: "concept", difficulty: 2, xp: 25, minutes: 7, terms: ["ufunction", "blueprintcallable"], skills: ["ue.objects.ufunction"], status: "passed", bestScore: 90 },
					{ id: "f1-training-dummy", title: "A training dummy the console can strike", kind: "build", scaffold: "worked", difficulty: 1, xp: 40, minutes: 20, terms: ["uproperty", "ufunction"], skills: ["ue.objects.actors"], status: "passed", bestScore: 92 },
					{ id: "f1-uenum-and-ustruct", title: "UENUM and USTRUCT bring your own types into reflection", kind: "concept", difficulty: 2, xp: 25, minutes: 6, terms: ["uenum", "ustruct"], skills: ["ue.objects.types"], status: "passed", bestScore: 80 },
					{ id: "f1-popup-target", title: "A pop-up target that shows its state by name", kind: "build", scaffold: "faded", difficulty: 2, xp: 60, minutes: 25, terms: ["uenum", "timer-manager"], skills: ["ue.objects.actors"], patterns: ["update-method"], status: "passed", bestScore: 74, dueForRematch: true },
					{ id: "f1-cast-and-isa", title: "Cast and IsA ask an object what it really is", kind: "concept", difficulty: 2, xp: 25, minutes: 6, terms: ["cast", "isa"], skills: ["ue.objects.casting"], status: "passed", bestScore: 100 },
					{ id: "f1-score-keeper", title: "A score keeper that tells dummies from targets", kind: "build", scaffold: "stub", difficulty: 2, xp: 80, minutes: 30, terms: ["cast", "tarray"], skills: ["ue.objects.casting"], patterns: ["component"], status: "passed", bestScore: 88 },
					{ id: "f1-practice-bell", title: "A bell whose ring Blueprint can restyle", kind: "build", scaffold: "blank", difficulty: 3, xp: 120, minutes: 40, terms: ["blueprintnativeevent", "blueprintimplementableevent"], skills: ["ue.objects.ufunction"], patterns: ["component"], status: "passed", bestScore: 81 },
					{ id: "f1-dash-with-cooldown", title: "Plan a dash with a cooldown", kind: "breakdown", difficulty: 2, xp: 90, minutes: 15, skills: ["breakdown.decompose"], status: "passed", bestScore: 85 },
					{ id: "f1-boss-training-yard", title: "Boss: the training yard", kind: "boss", difficulty: 3, xp: 300, minutes: 60, skills: ["breakdown.integrate"], patterns: ["component", "observer"], status: "passed", bestScore: 78 },
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
