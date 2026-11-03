---
id: m3-channels-and-responses
title: "Who stops whom: object types, responses, and profiles"
order: 2
kind: concept
difficulty: 2
patterns: []
skills: [collision]
terms: [collision-channel, collision-response, collision-preset, collision-enabled, box-component, sphere-component, capsule-component]
prerequisites: [m3-vault-plan]
xp: 30
estimatedMinutes: 9
concepts:
  - Every shape has an object type, a response to every channel, and a switch for queries and physics
  - When two shapes meet, the weaker of their two responses decides what happens
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a wall is set to Block the Pawn channel. A runner's body has the Pawn object type and is set to Overlap the WorldStatic channel, and the wall's object type is WorldStatic. The runner moves into the wall with a sweep. What happens?"
choices:
  - The runner stops, because the wall blocks pawns
  - The runner passes through, and the two shapes overlap
  - The runner stops only if it is moving fast
  - Nothing at all, as if neither shape existed
answerIndex: 1
explanation: Each shape looks up its response to the other's object type, and the weaker of the two wins. The wall says Block and the runner says Overlap, so they overlap.
```

# Card

Collision is a conversation between two **primitive components**, the shapes and meshes that have geometry. Each one carries three settings.

- **Collision Enabled** says what the shape takes part in at all. `NoCollision` takes part in nothing. `QueryOnly` answers questions such as sweeps, traces, and overlap checks, but physics bodies pass through it; it is the usual setting for a trigger. `QueryAndPhysics` does both, for solid things. `PhysicsOnly` is for bodies that should push and be pushed but never be found by a query.
- The **object type** says what the shape is: `WorldStatic` for things that never move, `WorldDynamic` for things that move by code, `Pawn` for player and AI bodies, `PhysicsBody` for simulated bodies, and a few more. The object type is a setting on the component, not a fact about the class: a plain `AActor` whose sphere says Pawn is a pawn as far as collision cares.
- A **response** to every channel says how the shape treats things of that object type: **Ignore**, **Overlap**, or **Block**. A channel is either an object type or a trace channel such as `Visibility`, which only queries use and which comes back in the tracing world.

When two shapes meet, each looks up its response to the other's object type, and the **weaker of the two wins**, in the order Ignore, Overlap, Block. Both Block: the shapes stop each other and a hit can fire. Either says Ignore: nothing happens. Otherwise they overlap and can fire overlap events. A wall that blocks pawns does not stop a runner that only overlaps walls. Almost every "it walks through the wall" bug is one wrong response on one side.

Ticking a dozen boxes per shape gets old, so a **collision profile** (the editor calls it a preset) bundles all three settings under one name:

- `BlockAll`: WorldStatic, blocks everything. `BlockAllDynamic`: the same as a WorldDynamic.
- `OverlapAllDynamic`: WorldDynamic, query only, overlaps everything. Every box, sphere, and capsule component starts with this one.
- `Pawn`: object type Pawn, ignores Visibility, blocks the rest.
- `NoCollision`: collision off.

Read a profile's whole table before trusting its name. `OverlapOnlyPawn` overlaps pawns and vehicles and ignores the camera, but every other channel keeps the default, which is Block, so a crate swept into it stops.

In code, `SetCollisionProfileName(TEXT("BlockAllDynamic"))` picks a profile, and `SetCollisionEnabled`, `SetCollisionObjectType`, `SetCollisionResponseToAllChannels`, and `SetCollisionResponseToChannel(ECC_Pawn, ECR_Overlap)` change one setting. Changing a single response turns the profile into Custom. All of them work while the game runs. The profile, response, and Collision Enabled setters bring the shape's overlaps up to date at once; a changed object type is only noticed the next time the shape moves.

Your own object types and trace channels are added under Project Settings, Collision, and appear in code as `ECC_GameTraceChannel1` and onward. To see the shapes in a running game, type `show Collision` in the console.

# Example

```cpp
ADojoTrapDoor::ADojoTrapDoor()
{
	Hatch = CreateDefaultSubobject<UBoxComponent>(TEXT("Hatch"));
	Hatch->SetBoxExtent(FVector(100.f, 100.f, 10.f));
	Hatch->SetCollisionProfileName(TEXT("BlockAllDynamic"));
	RootComponent = Hatch;

	Sensor = CreateDefaultSubobject<USphereComponent>(TEXT("Sensor"));
	Sensor->SetupAttachment(Hatch);
	Sensor->SetSphereRadius(250.f);
	Sensor->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
	Sensor->SetCollisionResponseToAllChannels(ECR_Ignore);
	Sensor->SetCollisionResponseToChannel(ECC_Pawn, ECR_Overlap);
}
```

# Questions

```yaml
- id: weaker-wins
  type: multiple-choice
  prompt: "A crate blocks everything. A trigger box overlaps everything. The crate is moved into the trigger with a sweep. What happens?"
  choices:
    - The crate stops at the trigger's edge
    - The crate passes in and the two overlap
    - The crate is ignored by the trigger
  answerIndex: 1
  explanation: Block against Overlap is an overlap, because the weaker response wins. A trigger that overlaps everything never stops anything.
- id: fill-channel
  type: fill-blank
  prompt: "To make a solid box let pawns pass through while still blocking everything else, write Box->SetCollisionResponseToChannel(___, ECR_Overlap)."
  acceptedAnswers: [ECC_Pawn, "ECollisionChannel::ECC_Pawn"]
  explanation: ECC_Pawn is the channel for shapes whose object type is Pawn; changing only that response leaves the box solid to everything else.
- id: profile-surprise
  type: spot-the-bug
  prompt: A zone should notice runners and let moving crates pass straight through it, but crates pushed into it with a sweep stop at its edge. Which line is wrong?
  code: |
    Zone = CreateDefaultSubobject<UBoxComponent>(TEXT("Zone"));
    Zone->SetBoxExtent(FVector(200.f, 200.f, 100.f));
    Zone->SetCollisionProfileName(TEXT("OverlapOnlyPawn"));
    RootComponent = Zone;
  bugLine: 3
  fix: Use a profile, or responses set by hand, that ignore or overlap the crates' channel, because OverlapOnlyPawn leaves every channel it does not name at Block.
  explanation: The profile's name describes what it overlaps, not what it does with everything else, and the default for every other channel is Block.
- id: query-only
  type: multiple-choice
  prompt: "Which Collision Enabled setting suits a pickup's trigger sphere?"
  choices:
    - QueryAndPhysics, so it is solid
    - QueryOnly, so overlap checks find it but nothing is pushed by it
    - NoCollision, because triggers do not collide
    - PhysicsOnly, so the engine moves it
  answerIndex: 1
  explanation: A trigger has to answer overlap queries and must not push anything. NoCollision would stop it noticing anything at all.
- id: object-type-not-class
  type: multiple-choice
  prompt: "A plain AActor, not a pawn, has a sphere component set to the Pawn profile. A trigger set to overlap only the Pawn channel is placed around it. Does the trigger notice it?"
  choices:
    - No, only APawn subclasses count as pawns
    - Yes, because the object type is a setting on the shape, not the class of its actor
    - Only if the actor is possessed by a controller
  answerIndex: 1
  explanation: Collision compares components, and each component's object type is its own setting.
- id: explain-weaker
  type: explain-in-one-sentence
  prompt: In one sentence, say how the engine decides whether two shapes block, overlap, or ignore each other.
  modelAnswer: Each shape looks up its response to the other's object type, and the weaker of the two responses, in the order Ignore, Overlap, Block, is what happens.
  rubric:
    - Says each side's response to the other's object type is used
    - Says the weaker response wins
  explanation: One rule covers every pair, which is why a single wrong response on either side is enough to change the result.
```
