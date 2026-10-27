---
id: p9-component-when-not
title: When a part should not be a part
order: 6
kind: concept
difficulty: 2
patterns: [component]
skills: [component, architecture]
terms: [actor-component, scene-component, spawnactor, attach-to-component, tick-prerequisite]
prerequisites: [p9-gladiator-refactor]
xp: 25
estimatedMinutes: 7
concepts:
  - A small actor with one job does not need its job moved into a part
  - Parts that keep reaching into each other are split in the wrong place
  - Something with its own place, lifetime, or presence in the level is an actor, attached or spawned, not a component
  - Parts that must run in a fixed order each frame need an explicit tick prerequisite, or one part that owns the change
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: when a crate breaks, its loot should land on the floor as a pouch the player can walk over and pick up, even after the crate is gone. Should the pouch be a component on the crate?"
choices:
  - Yes, a pouch component on the crate
  - No, the pouch is its own actor that the crate's loot part spawns, because it must outlive the crate and sit in the level by itself
  - Yes, but a scene component so it has a location
  - It does not matter
answerIndex: 1
explanation: A component lives and dies with its owner. Something that must stay in the level after the crate is destroyed, with its own place and its own overlap, is an actor.
```

# Card

Parts pay when one object needs several abilities and other objects need the same abilities in other mixes. Outside that, they add pieces to wire.

**A small actor with one job.** A spinning coin that does nothing but spin and be collected is fine as one actor class. Moving the spin into a part and the pickup into another gives two parts and wiring for an object nothing else resembles.

**Parts that keep reaching into each other.** If the movement part reads the weapon part's ammo, the weapon part reads the movement part's speed, and both read the health part's armor, the split is in the wrong place. Merge the pieces that change together, or move the shared rule to the owner.

**When it should be an actor.** A component lives and dies with its owner, and moves with it if it is a scene component. Make the thing an actor when:

- it must outlive the owner, such as a dropped pouch, a fired arrow, or a scorch mark;
- it has its own place, collision, or lifetime in the level, and designers place, select, or count it by itself;
- it can be destroyed or fight on its own, such as a turret bolted to a wall that players can knock off;
- several owners share it, or it moves between owners.

An attached actor (`AttachToActor` or `AttachToComponent`) moves with its owner like a scene component, while staying its own thing.

**Order between parts.** Each part's tick runs in no fixed order relative to its siblings unless you say so. If one part must see another's change in the same frame, add a tick prerequisite (`AddTickPrerequisiteComponent`), or better, let one part own the change, as the stamina part owns every change to stamina.

**A part for every tiny behavior.** One part per sliver of behavior turns an actor into a pile of parts that each do almost nothing, with wiring between all of them. Group behavior that always travels together into one part.

# Example

```cpp
// Right-sized: the pouch must outlive the crate, so the loot part spawns an actor instead of adding a component.
void UDojoArenaLoot::Drop()
{
	const FVector Spot = GetOwner()->GetActorLocation();
	GetWorld()->SpawnActor<ADojoArenaLootPouch>(PouchClass, Spot, FRotator::ZeroRotator);
}
```

# Questions

```yaml
- id: when-not-coin
  type: multiple-choice
  prompt: "Which of these needs to be split into parts least?"
  choices:
    - A spinning coin that only spins and is collected, used nowhere else
    - A gladiator with health, stamina, sprint, and a shield
    - Props that mix health, loot, and burning in many combinations
    - A champion whose stamina must also work on mounts and carts
  answerIndex: 0
  explanation: The coin has one job and shares nothing; the others mix abilities that other objects need too.
- id: when-not-actor
  type: multiple-choice
  prompt: "A wall carries a ballista that players can knock off with enough hits, after which it lies in the level on its own. What should the ballista be?"
  choices:
    - A scene component on the wall
    - Its own actor, attached to the wall until it is knocked off
    - A delegate on the wall
    - A float on the wall for its health
  answerIndex: 1
  explanation: The ballista has its own health, its own life after leaving the wall, and its own place in the level, so it is an actor attached to the wall, not a part of it.
- id: spot-reach-in
  type: spot-the-bug
  prompt: These parts are split in the wrong place. Which line shows one part depending on another part's insides?
  code: |
    void UDojoArenaMovement::TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)
    {
    	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
    	const UDojoArenaWeapon* Weapon = GetOwner()->FindComponentByClass<UDojoArenaWeapon>();
    	Speed = BaseSpeed - Weapon->LoadedAmmo * Weapon->AmmoWeight;
    	Move(DeltaTime);
    }
  bugLine: 5
  fix: Let the weapon part expose one number, its carried weight, or broadcast when it changes; the movement part should not compute from the weapon's ammo fields.
  explanation: The movement part now breaks whenever the weapon's ammo rules change, which is the coupling the parts were meant to remove.
- id: when-not-order
  type: multiple-choice
  prompt: "A facing part writes which way the gladiator faces each frame, and a visuals part must draw that same frame's facing. What makes the order reliable?"
  choices:
    - Adding the facing part first in the constructor
    - A tick prerequisite so the visuals part ticks after the facing part, or one part that does both
    - Ticking the visuals part twice
    - Nothing; parts always tick in the order they were made
  answerIndex: 1
  explanation: Sibling parts have no promised tick order; a prerequisite states it, or one part owns the change.
- id: explain-when-not
  type: explain-in-one-sentence
  prompt: In one sentence, say when something should be an actor rather than a component on another actor.
  modelAnswer: When it must outlive its owner, has its own place or collision or lifetime in the level, can be destroyed or act on its own, or is shared between owners.
  rubric:
    - Names at least one reason such as outliving the owner, its own place or lifetime, acting on its own, or being shared
    - Contrasts with a component living and dying with its owner
  explanation: A component is part of one actor; an actor is a thing of its own.
```
